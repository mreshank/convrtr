export function outputFilename(input: string, ext: string): string {
	const dot = input.lastIndexOf(".");
	const stem = dot === -1 ? input : input.slice(0, dot);
	return `${stem}.${ext}`;
}

export function acceptsFile(
	file: File,
	accept: { mime: string[]; ext: string[] },
): boolean {
	if (file.type && accept.mime.includes(file.type)) return true;
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	return accept.ext.includes(ext);
}

export function readFile(file: File): Promise<ArrayBuffer> {
	return file.arrayBuffer();
}

type PickerWindow = Window & {
	showSaveFilePicker?: (options: {
		suggestedName: string;
		types: { description: string; accept: Record<string, string[]> }[];
	}) => Promise<FileSystemFileHandle>;
};

export async function saveOutput(
	bytes: ArrayBuffer,
	filename: string,
	mime: string,
): Promise<void> {
	const picker = (window as PickerWindow).showSaveFilePicker;
	const blob = new Blob([bytes], { type: mime });

	if (picker) {
		try {
			const handle = await picker({
				suggestedName: filename,
				types: [
					{
						description: mime,
						accept: { [mime]: [`.${filename.split(".").pop()}`] },
					},
				],
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;
		}
	}

	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	// Firefox and Safari have historically cancelled a download that is still
	// starting when the object URL backing it is revoked synchronously.
	// Deferring the revoke lets the browser pick up the click first.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Saves a stream straight to disk without ever holding it whole.
 *
 * `saveOutput` builds a Blob from an ArrayBuffer, which means the entire
 * output is resident before a single byte reaches disk — fine for an image,
 * ruinous for a 2GB video. Piping a stream into the File System Access
 * writable keeps peak memory at one chunk.
 *
 * This only works where `showSaveFilePicker` exists. The anchor-download
 * fallback fundamentally cannot stream: it needs a Blob URL, and building
 * that Blob is precisely the allocation being avoided. So callers with a
 * genuinely large payload need `canStreamToDisk()` to decide, rather than
 * discovering at save time that the browser cannot do it.
 */
export async function saveOutputStream(
	source: ReadableStream<Uint8Array>,
	filename: string,
	mime: string,
): Promise<boolean> {
	const picker = (window as PickerWindow).showSaveFilePicker;
	if (!picker) return false;

	let handle: FileSystemFileHandle;
	try {
		handle = await picker({
			suggestedName: filename,
			types: [
				{
					description: mime,
					accept: { [mime]: [`.${filename.split(".").pop()}`] },
				},
			],
		});
	} catch (error) {
		// Dismissing the dialog is a cancellation, not a failure — and must not
		// fall through to a fallback that saves the file anyway.
		if (error instanceof DOMException && error.name === "AbortError") {
			return true;
		}
		throw error;
	}

	const writable = await handle.createWritable();
	try {
		await source.pipeTo(writable);
	} catch (error) {
		// Leave no half-written file presenting itself as a finished conversion.
		await writable.abort().catch(() => {});
		throw error;
	}
	return true;
}

/**
 * Whether this browser can write a large file without buffering it in memory.
 *
 * Worth checking before starting work on a very large input rather than after:
 * telling someone up front that their browser cannot handle a 3GB file is far
 * better than spending two minutes converting it and failing at the save.
 */
export function canStreamToDisk(): boolean {
	return typeof (window as PickerWindow).showSaveFilePicker === "function";
}
