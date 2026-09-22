import * as fflate from "fflate";

export interface XdExtractionResult {
	pngData: Uint8Array;
	width?: number;
	height?: number;
	source: string;
}

/**
 * Extracts the rendered artboard preview from an Adobe XD (`.xd`) file.
 *
 * XD documents are ZIP archives; every save bakes raster previews under
 * `previews/` (thumbnails) and `renditions/` (full artboard renders).
 * With XD discontinued, designers and developers stuck with .xd files and
 * no Adobe subscription get their screens back as PNGs — same
 * ZIP-preview pattern as the Sketch extractor, different directory names.
 */
export function parseXd(fileBytes: Uint8Array): XdExtractionResult {
	if (fileBytes.length < 16) {
		throw new Error("Invalid XD file: file is smaller than 16 bytes.");
	}
	if (
		fileBytes[0] !== 0x50 ||
		fileBytes[1] !== 0x4b ||
		fileBytes[2] !== 0x03 ||
		fileBytes[3] !== 0x04
	) {
		throw new Error("Invalid XD file: missing PKZIP container signature.");
	}

	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = fflate.unzipSync(fileBytes);
	} catch (err) {
		throw new Error(
			`Failed to unpack XD ZIP archive: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	const preferred = new Set([
		"previews/preview.png",
		"preview.png",
		"thumbnail.png",
	]);
	const rank = (p: string): number => {
		const l = p.toLowerCase();
		if (preferred.has(l)) return 0;
		if (l.includes("rendition")) return 0;
		if (l.includes("preview")) return 1;
		return 2;
	};
	const pngs = Object.keys(unzipped).filter((p) =>
		p.toLowerCase().endsWith(".png"),
	);
	pngs.sort((a, b) => {
		const rankDiff = rank(a) - rank(b);
		if (rankDiff !== 0) return rankDiff;
		return (unzipLen(unzipped, b) ?? 0) - (unzipLen(unzipped, a) ?? 0);
	});
	const best = pngs[0];
	const bestData = best ? unzipped[best] : undefined;
	if (best && bestData && bestData.length > 8) {
		return { pngData: bestData, ...pngSize(bestData), source: best };
	}
	throw new Error(
		"No artboard preview found in this XD (.xd) archive. Re-saving once in XD regenerates the previews.",
	);
}

function unzipLen(
	map: Record<string, Uint8Array>,
	key: string,
): number | undefined {
	return map[key]?.length;
}

function pngSize(png: Uint8Array): { width?: number; height?: number } {
	if (png.length < 24) return {};
	const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
	if (
		png[0] === 0x89 &&
		png[1] === 0x50 &&
		png[2] === 0x4e &&
		png[3] === 0x47
	) {
		const width = view.getUint32(16, false);
		const height = view.getUint32(20, false);
		if (width > 0 && height > 0) return { width, height };
	}
	return {};
}

export function convertXdToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Inspecting XD document structure...");
	const parsed = parseXd(new Uint8Array(input));
	onProgress?.(0.7, "Extracting artboard preview...");
	onProgress?.(1.0, "Complete");
	const buf = parsed.pngData.buffer.slice(
		parsed.pngData.byteOffset,
		parsed.pngData.byteOffset + parsed.pngData.byteLength,
	);
	return buf as ArrayBuffer;
}
