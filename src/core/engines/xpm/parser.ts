import { encodeRgbaToPng } from "../dds/parser";

export interface XpmMetadata {
	width: number;
	height: number;
	numColors: number;
	charsPerPixel: number;
	pngBytes: Uint8Array;
}

const X11_NAMED_COLORS: Record<string, [number, number, number]> = {
	black: [0, 0, 0],
	white: [255, 255, 255],
	red: [255, 0, 0],
	green: [0, 128, 0],
	blue: [0, 0, 255],
	yellow: [255, 255, 0],
	cyan: [0, 255, 255],
	magenta: [255, 0, 255],
	gray: [128, 128, 128],
	grey: [128, 128, 128],
	darkgray: [169, 169, 169],
	darkgrey: [169, 169, 169],
	lightgray: [211, 211, 211],
	lightgrey: [211, 211, 211],
	orange: [255, 165, 0],
	brown: [165, 42, 42],
	pink: [255, 192, 203],
	purple: [128, 0, 128],
	violet: [238, 130, 238],
};

function parseColorValue(rawVal: string): [number, number, number, number] {
	const trimmed = rawVal.trim();
	if (
		trimmed.toLowerCase() === "none" ||
		trimmed.toLowerCase() === "transparent"
	) {
		return [0, 0, 0, 0];
	}

	if (trimmed.startsWith("#")) {
		const hex = trimmed.slice(1);
		if (hex.length === 3) {
			const h0 = hex[0] ?? "0";
			const h1 = hex[1] ?? "0";
			const h2 = hex[2] ?? "0";
			const r = Number.parseInt(h0 + h0, 16) || 0;
			const g = Number.parseInt(h1 + h1, 16) || 0;
			const b = Number.parseInt(h2 + h2, 16) || 0;
			return [r, g, b, 255];
		}
		if (hex.length === 6) {
			const r = Number.parseInt(hex.slice(0, 2), 16) || 0;
			const g = Number.parseInt(hex.slice(2, 4), 16) || 0;
			const b = Number.parseInt(hex.slice(4, 6), 16) || 0;
			return [r, g, b, 255];
		}
		if (hex.length === 12) {
			// 16 bits per channel: take most significant 8 bits
			const r = Number.parseInt(hex.slice(0, 2), 16) || 0;
			const g = Number.parseInt(hex.slice(4, 6), 16) || 0;
			const b = Number.parseInt(hex.slice(8, 10), 16) || 0;
			return [r, g, b, 255];
		}
	}

	const named = X11_NAMED_COLORS[trimmed.toLowerCase()];
	if (named) {
		return [named[0], named[1], named[2], 255];
	}

	return [0, 0, 0, 255];
}

/**
 * Extracts string elements from an XPM file.
 * Handles both XPM3 C-style arrays: "string1", "string2", and XPM2 raw lines.
 */
function extractXpmStrings(content: string): string[] {
	const quotedMatches = content.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
	if (quotedMatches && quotedMatches.length > 0) {
		return quotedMatches.map((str) => str.slice(1, -1));
	}

	// Fallback to XPM2 plain lines
	const lines = content.split(/\r?\n/);
	const results: string[] = [];
	let started = false;

	for (const line of lines) {
		if (!started) {
			const trimmed = line.trim();
			if (
				trimmed.startsWith("! XPM2") ||
				/^\d+\s+\d+\s+\d+\s+\d+/.test(trimmed)
			) {
				started = true;
				if (!trimmed.startsWith("!")) {
					results.push(line);
				}
			}
		} else if (line.length > 0) {
			results.push(line);
		}
	}

	return results;
}

/**
 * Parses an X11 X PixMap (.xpm) file into a 32-bit RGBA PNG image.
 */
export function parseXpm(xpmText: string): XpmMetadata {
	const strings = extractXpmStrings(xpmText);
	if (strings.length < 2) {
		throw new Error(
			"Invalid XPM file: Could not locate dimension header and palette entries.",
		);
	}

	const headerStr = strings[0] ?? "";
	const headerParts = headerStr.trim().split(/\s+/);
	if (headerParts.length < 4) {
		throw new Error(
			`Invalid XPM header: Expected 4 values (width height num_colors chars_per_pixel), received '${headerStr}'.`,
		);
	}

	const width = Number.parseInt(headerParts[0] ?? "0", 10);
	const height = Number.parseInt(headerParts[1] ?? "0", 10);
	const numColors = Number.parseInt(headerParts[2] ?? "0", 10);
	const charsPerPixel = Number.parseInt(headerParts[3] ?? "0", 10);

	if (
		Number.isNaN(width) ||
		Number.isNaN(height) ||
		Number.isNaN(numColors) ||
		Number.isNaN(charsPerPixel) ||
		width <= 0 ||
		height <= 0 ||
		numColors <= 0 ||
		charsPerPixel <= 0 ||
		width > 16384 ||
		height > 16384
	) {
		throw new Error(
			`Invalid XPM dimensions: ${width}x${height}, ${numColors} colors, ${charsPerPixel} cpp.`,
		);
	}

	if (strings.length < 1 + numColors + height) {
		throw new Error(
			`Invalid XPM file: Expected at least ${1 + numColors + height} string rows, found ${strings.length}.`,
		);
	}

	// Parse color palette
	const colorMap = new Map<string, [number, number, number, number]>();

	for (let i = 0; i < numColors; i++) {
		const entryStr = strings[1 + i] ?? "";
		const charKey = entryStr.slice(0, charsPerPixel);
		const specRest = entryStr.slice(charsPerPixel);

		// Look for 'c <color>' or 'm <color>' or 'g <color>'
		const colorSpecMatch = specRest.match(/\b([cmg]|g4|s)\s+([^a-z]|\S+)/i);
		let rawColor = "None";
		if (colorSpecMatch?.[2]) {
			rawColor = colorSpecMatch[2].trim();
		} else {
			const parts = specRest.trim().split(/\s+/);
			if (parts.length >= 2) {
				rawColor = parts[1] ?? "None";
			}
		}

		colorMap.set(charKey, parseColorValue(rawColor));
	}

	// Decode pixel data
	const rgba = new Uint8Array(width * height * 4);

	for (let y = 0; y < height; y++) {
		const rowStr = strings[1 + numColors + y] ?? "";
		const rowOffset = y * width * 4;

		for (let x = 0; x < width; x++) {
			const charStart = x * charsPerPixel;
			const pixelKey = rowStr.slice(charStart, charStart + charsPerPixel);
			const color = colorMap.get(pixelKey) ?? [0, 0, 0, 0];

			const pxOffset = rowOffset + x * 4;
			rgba[pxOffset] = color[0];
			rgba[pxOffset + 1] = color[1];
			rgba[pxOffset + 2] = color[2];
			rgba[pxOffset + 3] = color[3];
		}
	}

	const pngBytes = encodeRgbaToPng(width, height, rgba);

	return {
		width,
		height,
		numColors,
		charsPerPixel,
		pngBytes,
	};
}

/**
 * Converts an XPM buffer into a PNG ArrayBuffer.
 */
export function convertXpmToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading X11 X PixMap source");
	const text = new TextDecoder("utf-8").decode(input);

	onProgress?.(0.5, "Parsing XPM palette and decoding pixel raster");
	const meta = parseXpm(text);

	onProgress?.(0.9, "Synthesizing lossless PNG image");
	return meta.pngBytes.buffer.slice(
		meta.pngBytes.byteOffset,
		meta.pngBytes.byteOffset + meta.pngBytes.byteLength,
	) as ArrayBuffer;
}
