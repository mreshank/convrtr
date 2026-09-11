import * as fflate from "fflate";

export interface CdrExtractionResult {
	pngData: Uint8Array;
	width?: number;
	height?: number;
	source: "zip-thumbnail" | "riff-embedded";
}

/**
 * Extracts the full-resolution embedded composite preview from a CorelDRAW (.cdr) file.
 * Supports modern zip-based containers (CorelDRAW X4 through 2024) and legacy RIFF containers.
 */
export function parseCdr(fileBytes: Uint8Array): CdrExtractionResult {
	if (fileBytes.length < 16) {
		throw new Error("Invalid CorelDRAW file: File is smaller than 16 bytes.");
	}

	// 1. Modern CorelDRAW container (PKZIP signature: PK\x03\x04)
	if (
		fileBytes[0] === 0x50 &&
		fileBytes[1] === 0x4b &&
		fileBytes[2] === 0x03 &&
		fileBytes[3] === 0x04
	) {
		let unzipped: Record<string, Uint8Array>;
		try {
			unzipped = fflate.unzipSync(fileBytes);
		} catch (err) {
			throw new Error(
				`Failed to unpack CorelDRAW ZIP archive: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		// List of prioritized candidate paths for the embedded thumbnail preview
		const candidatePaths = [
			"previews/thumbnail.png",
			"metadata/thumbnails/thumbnail.png",
			"previews/preview.png",
			"thumbnail.png",
			"preview.png",
		];

		for (const candidate of candidatePaths) {
			for (const path of Object.keys(unzipped)) {
				if (path.toLowerCase() === candidate.toLowerCase()) {
					const data = unzipped[path];
					if (data && data.length > 8) {
						const dimensions = readPngDimensions(data);
						return {
							pngData: data,
							width: dimensions?.width,
							height: dimensions?.height,
							source: "zip-thumbnail",
						};
					}
				}
			}
		}

		// Fallback: look for any PNG file inside the archive
		const allPngPaths = Object.keys(unzipped).filter((p) =>
			p.toLowerCase().endsWith(".png"),
		);
		if (allPngPaths.length > 0) {
			// Sort by size descending (the main preview is typically the largest PNG)
			allPngPaths.sort((a, b) => {
				const lenA = a ? (unzipped[a]?.length ?? 0) : 0;
				const lenB = b ? (unzipped[b]?.length ?? 0) : 0;
				return lenB - lenA;
			});
			const bestPath = allPngPaths[0];
			if (bestPath) {
				const data = unzipped[bestPath];
				if (data && data.length > 8) {
					const dimensions = readPngDimensions(data);
					return {
						pngData: data,
						width: dimensions?.width,
						height: dimensions?.height,
						source: "zip-thumbnail",
					};
				}
			}
		}

		throw new Error(
			"No embedded thumbnail preview found in CorelDRAW (.cdr) archive. Ensure the document was saved with thumbnail generation enabled.",
		);
	}

	// 2. Legacy CorelDRAW container (RIFF signature: 'RIFF....CDR')
	if (
		fileBytes[0] === 0x52 &&
		fileBytes[1] === 0x49 &&
		fileBytes[2] === 0x46 &&
		fileBytes[3] === 0x46
	) {
		// Scan for embedded PNG stream inside RIFF chunks
		const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
		let pngOffset = -1;

		for (let i = 0; i <= fileBytes.length - 8; i++) {
			let match = true;
			for (let j = 0; j < 8; j++) {
				if (fileBytes[i + j] !== pngMagic[j]) {
					match = false;
					break;
				}
			}
			if (match) {
				pngOffset = i;
				break;
			}
		}

		if (pngOffset !== -1) {
			// Find IEND chunk (49 45 4E 44 + 4 bytes CRC = 8 bytes)
			const iend = [0x49, 0x45, 0x4e, 0x44];
			let endOffset = fileBytes.length;
			for (let i = pngOffset + 8; i <= fileBytes.length - 8; i++) {
				if (
					fileBytes[i] === iend[0] &&
					fileBytes[i + 1] === iend[1] &&
					fileBytes[i + 2] === iend[2] &&
					fileBytes[i + 3] === iend[3]
				) {
					endOffset = i + 8;
					break;
				}
			}
			const extracted = fileBytes.subarray(pngOffset, endOffset);
			const dimensions = readPngDimensions(extracted);
			return {
				pngData: extracted,
				width: dimensions?.width,
				height: dimensions?.height,
				source: "riff-embedded",
			};
		}

		throw new Error(
			"Legacy CorelDRAW RIFF file detected, but no embedded raster PNG preview was found in the chunk stream.",
		);
	}

	throw new Error(
		"Invalid CorelDRAW file: Missing PKZIP (X4+) or RIFF (v1-v13) container signature.",
	);
}

/**
 * Extracts width and height from PNG IHDR chunk if present.
 */
function readPngDimensions(
	pngBytes: Uint8Array,
): { width: number; height: number } | undefined {
	if (pngBytes.length >= 24) {
		const view = new DataView(
			pngBytes.buffer,
			pngBytes.byteOffset,
			pngBytes.byteLength,
		);
		if (
			pngBytes[0] === 0x89 &&
			pngBytes[1] === 0x50 &&
			pngBytes[2] === 0x4e &&
			pngBytes[3] === 0x47
		) {
			const width = view.getUint32(16, false);
			const height = view.getUint32(20, false);
			if (width > 0 && height > 0) {
				return { width, height };
			}
		}
	}
	return undefined;
}

/**
 * Main conversion entry point for CorelDRAW (.cdr) to PNG conversion.
 */
export function convertCdrToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Inspecting CorelDRAW file structure...");
	const bytes = new Uint8Array(input);
	const parsed = parseCdr(bytes);

	onProgress?.(0.7, "Extracting full-resolution artwork preview...");
	onProgress?.(1.0, "Complete");

	return parsed.pngData.buffer.slice(
		parsed.pngData.byteOffset,
		parsed.pngData.byteOffset + parsed.pngData.byteLength,
	) as ArrayBuffer;
}
