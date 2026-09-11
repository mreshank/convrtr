import { encodeRgbaToPng } from "../dds/parser";

export interface XbmMetadata {
	name: string;
	width: number;
	height: number;
	pngBytes: Uint8Array;
}

export interface XbmOptions {
	transparentBackground?: boolean;
}

/**
 * Parses an X11 X BitMap (.xbm) C-code source file and decodes the 1-bit monochrome
 * pixel data into a standard 32-bit RGBA PNG image.
 */
export function parseXbm(
	xbmText: string,
	options: XbmOptions = {},
): XbmMetadata {
	const transparentBg = options.transparentBackground ?? true;

	// Extract width
	const widthMatch = xbmText.match(
		/#define\s+([A-Za-z0-9_]+_)?width\s+([0-9]+)/i,
	);
	if (!widthMatch?.[2]) {
		throw new Error("Invalid XBM file: Missing #define [name_]width macro.");
	}
	const width = Number.parseInt(widthMatch[2], 10);

	// Extract height
	const heightMatch = xbmText.match(
		/#define\s+([A-Za-z0-9_]+_)?height\s+([0-9]+)/i,
	);
	if (!heightMatch?.[2]) {
		throw new Error("Invalid XBM file: Missing #define [name_]height macro.");
	}
	const height = Number.parseInt(heightMatch[2], 10);

	if (width <= 0 || height <= 0 || width > 16384 || height > 16384) {
		throw new Error(`Invalid XBM dimensions: ${width}x${height}.`);
	}

	const name = (widthMatch[1] ?? "").replace(/_$/, "") || "bitmap";

	// Locate the start of the data array '{'
	const braceIndex = xbmText.indexOf("{");
	if (braceIndex === -1) {
		throw new Error("Invalid XBM file: Missing array data body '{'.");
	}

	const closeBraceIndex = xbmText.indexOf("}", braceIndex);
	const dataContent =
		closeBraceIndex !== -1
			? xbmText.slice(braceIndex + 1, closeBraceIndex)
			: xbmText.slice(braceIndex + 1);

	// Extract all numeric bytes (0xNN or decimal)
	const rawTokens = dataContent.split(/[\s,]+/);
	const bytes: number[] = [];

	for (const token of rawTokens) {
		const trimmed = token.trim();
		if (!trimmed) continue;

		let val = 0;
		if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
			val = Number.parseInt(trimmed.slice(2), 16);
		} else {
			val = Number.parseInt(trimmed, 10);
		}

		if (!Number.isNaN(val)) {
			bytes.push(val & 0xff);
		}
	}

	const bytesPerRow = Math.ceil(width / 8);
	const expectedBytes = bytesPerRow * height;

	if (bytes.length < expectedBytes) {
		// If incomplete, pad with 0s
		while (bytes.length < expectedBytes) {
			bytes.push(0);
		}
	}

	// Canvas: 32-bit RGBA
	const canvas = new Uint8Array(width * height * 4);

	for (let y = 0; y < height; y++) {
		const rowOffset = y * bytesPerRow;

		for (let x = 0; x < width; x++) {
			const byteIdx = rowOffset + Math.floor(x / 8);
			const bitIdx = x % 8; // LSB first in XBM
			const byteVal = bytes[byteIdx] ?? 0;
			const isSet = ((byteVal >> bitIdx) & 1) === 1;

			const dstIdx = (y * width + x) * 4;

			if (isSet) {
				// Foreground: Black
				canvas[dstIdx] = 0;
				canvas[dstIdx + 1] = 0;
				canvas[dstIdx + 2] = 0;
				canvas[dstIdx + 3] = 255;
			} else {
				// Background: Transparent or White
				if (transparentBg) {
					canvas[dstIdx] = 0;
					canvas[dstIdx + 1] = 0;
					canvas[dstIdx + 2] = 0;
					canvas[dstIdx + 3] = 0;
				} else {
					canvas[dstIdx] = 255;
					canvas[dstIdx + 1] = 255;
					canvas[dstIdx + 2] = 255;
					canvas[dstIdx + 3] = 255;
				}
			}
		}
	}

	const pngBytes = encodeRgbaToPng(width, height, canvas);

	return {
		name,
		width,
		height,
		pngBytes,
	};
}

/**
 * High-level engine runner for converting XBM files to PNG.
 */
export function convertXbmToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading XBM source text");
	const decoder = new TextDecoder("utf-8");
	const text = decoder.decode(input);

	onProgress?.(0.5, "Parsing X11 bitmap macros and unpacking LSB pixels");
	const metadata = parseXbm(text);

	onProgress?.(0.9, "Encoding PNG image");
	return metadata.pngBytes.buffer.slice(
		metadata.pngBytes.byteOffset,
		metadata.pngBytes.byteOffset + metadata.pngBytes.byteLength,
	) as ArrayBuffer;
}
