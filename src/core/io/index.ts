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
	URL.revokeObjectURL(url);
}
