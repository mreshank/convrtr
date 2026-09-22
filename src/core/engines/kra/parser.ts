import * as fflate from "fflate";

export interface KraExtractionResult {
	pngData: Uint8Array;
	width?: number;
	height?: number;
	source: "mergedimage" | "preview" | "thumbnail" | "largest-png-fallback";
}

/**
 * Extracts the flattened composite rendering from a Krita (.kra) document.
 *
 * A .kra file is a standard ZIP archive. Krita always writes a full-resolution
 * flattened composite as `mergedimage.png` at the archive root, plus a smaller
 * `preview.png` used by file managers. Either is a faithful render of the
 * layered canvas — no Krita install needed to see finished work.
 */
export function parseKra(fileBytes: Uint8Array): KraExtractionResult {
	if (fileBytes.length < 16) {
		throw new Error("Invalid Krita file: file is smaller than 16 bytes.");
	}

	if (
		fileBytes[0] !== 0x50 ||
		fileBytes[1] !== 0x4b ||
		fileBytes[2] !== 0x03 ||
		fileBytes[3] !== 0x04
	) {
		throw new Error(
			"Invalid Krita file: missing PKZIP container signature. A .kra document is a ZIP archive starting with PK\\x03\\x04.",
		);
	}

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = fflate.unzipSync(fileBytes);
	} catch (err) {
		throw new Error(
			`Failed to unpack Krita ZIP archive: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	const lower = new Map<string, string>();
	for (const path of Object.keys(unzipped)) {
		if (!lower.has(path.toLowerCase())) lower.set(path.toLowerCase(), path);
	}

	const candidates: Array<[string, KraExtractionResult["source"]]> = [
		["mergedimage.png", "mergedimage"],
		["preview.png", "preview"],
		["thumbnails/thumbnail.png", "thumbnail"],
		["thumbnail.png", "thumbnail"],
	];

	for (const [candidate, source] of candidates) {
		const real = lower.get(candidate);
		if (real) {
			const data = unzipped[real];
			if (data && data.length > 8) {
				const dimensions = readPngDimensions(data);
				return {
					pngData: data,
					width: dimensions?.width,
					height: dimensions?.height,
					source,
				};
			}
		}
	}

	// Fallback: the merged composite is the largest PNG in a healthy file.
	const allPngPaths = Object.keys(unzipped).filter((p) =>
		p.toLowerCase().endsWith(".png"),
	);
	if (allPngPaths.length > 0) {
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
					source: "largest-png-fallback",
				};
			}
		}
	}

	throw new Error(
		"No flattened artwork preview found in this Krita (.kra) archive. The file may be corrupted, or was saved without the merged-image preview Krita normally writes.",
	);
}

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

export function convertKraToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Inspecting Krita document structure...");
	const bytes = new Uint8Array(input);
	const parsed = parseKra(bytes);

	onProgress?.(0.7, "Extracting flattened artwork preview...");
	onProgress?.(1.0, "Complete");

	return parsed.pngData.buffer.slice(
		parsed.pngData.byteOffset,
		parsed.pngData.byteOffset + parsed.pngData.byteLength,
	) as ArrayBuffer;
}
