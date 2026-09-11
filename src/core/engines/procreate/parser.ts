import { unzipSync } from "fflate";

export interface ProcreatePayload {
	timelapseVideo?: ArrayBuffer;
	previewImage?: ArrayBuffer;
}

/**
 * Extracts the embedded timelapse MP4 or composite preview PNG from a Procreate (.procreate) file.
 *
 * Procreate files are standard ZIP archives containing:
 * - `video.mp4`: Hardware-recorded drawing session timelapse.
 * - `QuickLook/Thumbnail.png` (or `thumbnail.png`): High-resolution flattened composite of the artwork.
 * - `Document.archive`: Apple binary plist containing canvas layer metadata.
 */
export function extractProcreateTimelapse(input: ArrayBuffer): ArrayBuffer {
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(new Uint8Array(input));
	} catch (err) {
		throw new Error(
			`extractProcreateTimelapse: Invalid or corrupted .procreate ZIP container (${err instanceof Error ? err.message : String(err)})`,
		);
	}

	// Case-insensitive search for video.mp4 or any embedded MP4 file
	for (const [path, data] of Object.entries(unzipped)) {
		const lower = path.toLowerCase();
		if (
			lower === "video.mp4" ||
			lower.endsWith("/video.mp4") ||
			lower.endsWith(".mp4")
		) {
			return data.buffer.slice(
				data.byteOffset,
				data.byteOffset + data.byteLength,
			) as ArrayBuffer;
		}
	}

	throw new Error(
		"extractProcreateTimelapse: No timelapse video found. Time-lapse recording may have been disabled in Procreate for this canvas.",
	);
}

export function extractProcreatePreview(input: ArrayBuffer): ArrayBuffer {
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(new Uint8Array(input));
	} catch (err) {
		throw new Error(
			`extractProcreatePreview: Invalid or corrupted .procreate ZIP container (${err instanceof Error ? err.message : String(err)})`,
		);
	}

	// Priority order: QuickLook/Thumbnail.png -> QuickLook/thumbnail.png -> thumbnail.png -> any .png
	const candidates = ["quicklook/thumbnail.png", "thumbnail.png"];

	for (const candidate of candidates) {
		for (const [path, data] of Object.entries(unzipped)) {
			if (path.toLowerCase() === candidate) {
				return data.buffer.slice(
					data.byteOffset,
					data.byteOffset + data.byteLength,
				) as ArrayBuffer;
			}
		}
	}

	// Fallback to any PNG in the archive
	for (const [path, data] of Object.entries(unzipped)) {
		if (path.toLowerCase().endsWith(".png")) {
			return data.buffer.slice(
				data.byteOffset,
				data.byteOffset + data.byteLength,
			) as ArrayBuffer;
		}
	}

	throw new Error(
		"extractProcreatePreview: No preview image found in .procreate package.",
	);
}
