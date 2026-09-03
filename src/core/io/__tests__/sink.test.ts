import { describe, expect, it, vi } from "vitest";
import { createFileSink, pickSaveFile, SAVE_CANCELLED } from "../sink";

type Write = {
	type: "write";
	position: number;
	data: Uint8Array<ArrayBuffer>;
};

/**
 * Stands in for `FileSystemWritableFileStream`, recording which of the three
 * things that can happen to a file actually happened. The distinction the
 * tests care about is `close` (commits the file) versus `abort` (discards it),
 * which is invisible if you only assert on the bytes written.
 */
function fakeFile(options: { abortFails?: boolean } = {}) {
	const writes: Write[] = [];
	const calls: string[] = [];
	return {
		writes,
		calls,
		handle: {
			createWritable: async () => ({
				write: async (chunk: Write) => {
					writes.push(chunk);
				},
				close: async () => {
					calls.push("close");
				},
				abort: async () => {
					calls.push("abort");
					if (options.abortFails) throw new Error("abort failed");
				},
			}),
		} as unknown as FileSystemFileHandle,
	};
}

function chunk(position: number, byte: number): Write {
	return { type: "write", position, data: new Uint8Array([byte]) };
}

describe("pickSaveFile", () => {
	it("refuses when the browser has no save picker", async () => {
		await expect(pickSaveFile("a.mp4", "video/mp4", undefined)).rejects.toThrow(
			/cannot write files directly to disk/,
		);
	});

	it("reports a dismissed dialog as a cancellation, not an error", async () => {
		const picker = vi
			.fn()
			.mockRejectedValue(new DOMException("no", "AbortError"));

		await expect(pickSaveFile("a.mp4", "video/mp4", picker)).resolves.toBe(
			SAVE_CANCELLED,
		);
	});

	it("propagates a real picker failure rather than reporting cancellation", async () => {
		const picker = vi.fn().mockRejectedValue(new Error("disk on fire"));

		await expect(pickSaveFile("a.mp4", "video/mp4", picker)).rejects.toThrow(
			"disk on fire",
		);
	});

	it("offers the output extension so the dialog does not suggest the input's", async () => {
		const handle = {} as FileSystemFileHandle;
		const picker = vi.fn().mockResolvedValue(handle);

		await pickSaveFile("holiday.mp4", "video/mp4", picker);

		expect(picker).toHaveBeenCalledWith({
			suggestedName: "holiday.mp4",
			types: [
				{
					description: "video/mp4",
					accept: { "video/mp4": [".mp4"] },
				},
			],
		});
	});
});

describe("createFileSink", () => {
	it("forwards each write at the position the muxer asked for", async () => {
		const file = fakeFile();
		const sink = await createFileSink(file.handle);

		const writer = sink.sink.getWriter();
		// Deliberately out of order: MP4 seeks back to patch its header once the
		// sample sizes are known, so a sink that tracked a running offset would
		// corrupt the file here while looking correct in an append-only test.
		await writer.write(chunk(100, 1));
		await writer.write(chunk(0, 2));
		writer.releaseLock();

		expect(file.writes.map((w) => [w.position, w.data[0]])).toEqual([
			[100, 1],
			[0, 2],
		]);
	});

	it("does not commit the file when the muxer closes the sink", async () => {
		const file = fakeFile();
		const sink = await createFileSink(file.handle);

		// mediabunny closes its target from a `finally`, so this happens after a
		// failed conversion too. If closing the sink committed the file, every
		// crashed conversion would leave a truncated video looking finished.
		await sink.sink.close();

		expect(file.calls).toEqual([]);
	});

	it("commits only when the caller says the conversion succeeded", async () => {
		const file = fakeFile();
		const sink = await createFileSink(file.handle);

		await sink.sink.close();
		await sink.commit();

		expect(file.calls).toEqual(["close"]);
	});

	it("discards the write so no partial file is left behind", async () => {
		const file = fakeFile();
		const sink = await createFileSink(file.handle);

		const writer = sink.sink.getWriter();
		await writer.write(chunk(0, 1));
		writer.releaseLock();
		await sink.discard();

		expect(file.calls).toEqual(["abort"]);
	});

	it("cannot commit a file it already discarded", async () => {
		const file = fakeFile();
		const sink = await createFileSink(file.handle);

		await sink.discard();
		await sink.commit();

		// Without the settled guard the error path would abort and then the
		// success path would commit anyway, resurrecting the partial file.
		expect(file.calls).toEqual(["abort"]);
	});

	it("survives a failing abort so the original error is what surfaces", async () => {
		const file = fakeFile({ abortFails: true });
		const sink = await createFileSink(file.handle);

		await expect(sink.discard()).resolves.toBeUndefined();
	});
});
