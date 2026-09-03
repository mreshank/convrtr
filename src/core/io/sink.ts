import type { OutputSink, WriteChunk } from "@/core/engines/types";

/**
 * Streams a conversion straight to a file the user picked, without ever
 * holding the whole output in memory.
 *
 * ## Why this is not just `handle.createWritable()`
 *
 * A muxer closes its target when it finishes writing — and mediabunny closes
 * it from a `finally` block, so it also closes after a *failed* finalize, and
 * again on `cancel()`. For an ordinary stream that is harmless. For a
 * `FileSystemWritableFileStream`, `close()` is what **commits** the file to
 * disk.
 *
 * Handing the file stream to the muxer directly therefore means a conversion
 * that dies halfway still commits whatever bytes made it out — a truncated
 * video, with a plausible name and size, that the user has every reason to
 * believe is finished. It would very likely still play, showing the first few
 * seconds, which makes it worse: the corruption is not obvious until the
 * moment they need the rest.
 *
 * So the sink handed to the engine is a wrapper whose `close()` records that
 * the muxer stopped writing and does nothing else. Committing is a separate,
 * explicit act by the caller, which happens only once the engine has resolved
 * without throwing.
 *
 * ## What is still unavoidable
 *
 * The picker creates the file entry when the user confirms the name, before a
 * single byte is written. `discard()` aborts the writable, so none of our
 * writes land — but on a new file the browser may leave a zero-byte entry
 * behind, and on an overwrite the original contents survive untouched. An
 * empty file is an obvious failure; a truncated one is a disguised one, and
 * that trade is the entire point of this wrapper.
 */

type PickerWindow = Window & {
	showSaveFilePicker?: (options: {
		suggestedName: string;
		types: { description: string; accept: Record<string, string[]> }[];
	}) => Promise<FileSystemFileHandle>;
};

export type FileSink = {
	/** Hand this to the engine. */
	sink: OutputSink;
	/** Commit the file. Call only after the engine resolved successfully. */
	commit(): Promise<void>;
	/** Abandon the write so no partial file is presented as finished. */
	discard(): Promise<void>;
};

/** The user dismissed the save dialog — a cancellation, not a failure. */
export const SAVE_CANCELLED = Symbol("save-cancelled");

/**
 * Opens the save dialog and returns the chosen file's handle.
 *
 * Separate from {@link createFileSink} because the two halves belong on
 * different threads. The dialog must be opened from the user's click — browsers
 * require a user gesture, which only exists on the main thread — while the
 * writing belongs in the worker, so a long conversion does not jank the page.
 *
 * A `FileSystemFileHandle` is structured-cloneable, so the handle can cross to
 * the worker and the writable can be created there. Transferring the *stream*
 * instead would work, but every chunk would then be copied across the thread
 * boundary on its way back to a main-thread writable — pointless traffic on
 * exactly the files that are already large.
 *
 * Returns `SAVE_CANCELLED` if the user dismissed the dialog, so callers can
 * tell "no file chosen" from a real error without inspecting DOMException
 * names themselves.
 */
export async function pickSaveFile(
	filename: string,
	mime: string,
	openPicker: PickerWindow["showSaveFilePicker"] = (window as PickerWindow)
		.showSaveFilePicker,
): Promise<FileSystemFileHandle | typeof SAVE_CANCELLED> {
	if (!openPicker) {
		throw new Error(
			"This browser cannot write files directly to disk, so a large conversion cannot be streamed.",
		);
	}

	try {
		return await openPicker({
			suggestedName: filename,
			types: [
				{
					description: mime,
					accept: { [mime]: [`.${filename.split(".").pop()}`] },
				},
			],
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			return SAVE_CANCELLED;
		}
		throw error;
	}
}

/**
 * Wraps a picked file in a sink an engine can write to, with committing kept
 * as a separate decision — see the note at the top of this file for why that
 * separation is the whole point.
 */
export async function createFileSink(
	handle: FileSystemFileHandle,
): Promise<FileSink> {
	const writable = await handle.createWritable();

	let settled = false;
	const sink: OutputSink = new WritableStream<WriteChunk>({
		async write(chunk) {
			// Positioned writes: the muxer seeks back to patch headers, so the
			// offset comes from the chunk and never from a running total.
			await writable.write({
				type: "write",
				position: chunk.position,
				data: chunk.data,
			});
		},
		// Deliberately empty. The muxer calling close() means "I have stopped
		// writing", which is true of both success and failure — see the note
		// above. Committing is the caller's decision.
		close() {},
		abort() {},
	});

	return {
		sink,
		async commit() {
			if (settled) return;
			settled = true;
			await writable.close();
		},
		async discard() {
			if (settled) return;
			settled = true;
			// Never let a failed abort mask the error that caused the discard.
			await writable.abort().catch(() => {});
		},
	};
}
