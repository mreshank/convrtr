/**
 * Staged files waiting to be picked up by the converter.
 * This allows passing converted output files (from ToolClient or previous
 * conversions in MasterConverterClient) directly into the converter queue
 * in-memory without downloading and re-uploading.
 */

export type StagedConversion = {
	file: File;
	targetExt?: string;
	parentName?: string;
	step?: number;
};

let stagedQueue: StagedConversion[] = [];

/**
 * Stages files or rich conversion items to be consumed by the next converter session.
 */
export function stageFilesForConversion(
	items: (File | StagedConversion)[],
): void {
	const normalized: StagedConversion[] = items.map((item) =>
		item instanceof File ? { file: item } : item,
	);
	stagedQueue = [...stagedQueue, ...normalized];
}

/**
 * Retrieves and clears all currently staged conversion items.
 */
export function consumeStagedFiles(): StagedConversion[] {
	const items = stagedQueue;
	stagedQueue = [];
	return items;
}

/**
 * Returns true if there are files waiting in staging.
 */
export function hasStagedFiles(): boolean {
	return stagedQueue.length > 0;
}

/**
 * Clears any currently staged files.
 */
export function clearStagedFiles(): void {
	stagedQueue = [];
}

/**
 * Constructs a browser File object from raw output bytes, filename, and MIME type.
 */
export function createOutputFile(
	bytes: ArrayBuffer,
	filename: string,
	mimeType?: string,
): File {
	return new File([bytes], filename, {
		type: mimeType || "application/octet-stream",
		lastModified: Date.now(),
	});
}
