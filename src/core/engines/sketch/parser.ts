import * as fflate from "fflate";

export interface SketchExtractionResult {
	pngData: Uint8Array;
	width?: number;
	height?: number;
	source: "page-preview" | "preview" | "largest-png-fallback";
}

/**
 * Extracts the rendered page preview from a Sketch (.sketch) design file.
 *
 * A .sketch file is a standard ZIP archive. Sketch renders each page/artboard
 * to `previews/preview.png` (plus per-page files under `previews/`) every
 * time the document is saved, so the finished design can be viewed on Windows,
 * Linux, or mobile with no Mac and no Sketch licence.
 */
export function parseSketch(fileBytes: Uint8Array): SketchExtractionResult {
	if (fileBytes.length < 16) {
		throw new Error("Invalid Sketch file: file is smaller than 16 bytes.");
	}

	if (
		fileBytes[0] !== 0x50 ||
		fileBytes[1] !== 0x4b ||
		fileBytes[2] !== 0x03 ||
		fileBytes[3] !== 0x04
	) {
		throw new Error(
			"Invalid Sketch file: missing PKZIP container signature. A .sketch document is a ZIP archive starting with PK\\x03\\x04.",
		);
	}

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = fflate.unzipSync(fileBytes);
	} catch (err) {
		throw new Error(
			`Failed to unpack Sketch ZIP archive: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	const lower = new Map<string, string>();
	for (const path of Object.keys(unzipped)) {
		if (!lower.has(path.toLowerCase())) lower.set(path.toLowerCase(), path);
	}

	const candidates: Array<[string, SketchExtractionResult["source"]]> = [
		["previews/preview.png", "page-preview"],
		["preview.png", "preview"],
		["previews/thumbnail.png", "preview"],
		["thumbnail.png", "preview"],
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

	// Fallback: any per-page render under previews/ — take the largest PNG.
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
		"No page preview found in this Sketch (.sketch) archive. Open and re-save the document in Sketch with previews enabled, then try again.",
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

export function convertSketchToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Inspecting Sketch document structure...");
	const bytes = new Uint8Array(input);
	const parsed = parseSketch(bytes);

	onProgress?.(0.7, "Extracting page preview render...");
	onProgress?.(1.0, "Complete");

	return parsed.pngData.buffer.slice(
		parsed.pngData.byteOffset,
		parsed.pngData.byteOffset + parsed.pngData.byteLength,
	) as ArrayBuffer;
}
