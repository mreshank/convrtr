import { encodeRgbaToPng } from "../dds/parser";
import type { ZxConversionResult, ZxMetadata, ZxToPngOptions } from "./types";

const ZX_WIDTH = 256;
const ZX_HEIGHT = 192;
const BITMAP_SIZE = 6144;
const ATTR_SIZE = 768;
const TOTAL_SCREEN_SIZE = BITMAP_SIZE + ATTR_SIZE; // 6912

// Sinclair ZX Spectrum 16-color palette (RGBA)
export const PALETTE_NORMAL: [number, number, number, number][] = [
	[0, 0, 0, 255], // 0: Black
	[0, 0, 215, 255], // 1: Blue
	[215, 0, 0, 255], // 2: Red
	[215, 0, 215, 255], // 3: Magenta
	[0, 215, 0, 255], // 4: Green
	[0, 215, 215, 255], // 5: Cyan
	[215, 215, 0, 255], // 6: Yellow
	[215, 215, 215, 255], // 7: White
];

export const PALETTE_BRIGHT: [number, number, number, number][] = [
	[0, 0, 0, 255], // 0: Black
	[0, 0, 255, 255], // 1: Bright Blue
	[255, 0, 0, 255], // 2: Bright Red
	[255, 0, 255, 255], // 3: Bright Magenta
	[0, 255, 0, 255], // 4: Bright Green
	[0, 255, 255, 255], // 5: Bright Cyan
	[255, 255, 0, 255], // 6: Bright Yellow
	[255, 255, 255, 255], // 7: Bright White
];

/**
 * Parses and decodes a Sinclair ZX Spectrum Screen (.scr) file
 * into a lossless 32-bit RGBA PNG.
 */
export function convertZxToPng(
	input: Uint8Array | ArrayBuffer,
	options: ZxToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ZxConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < TOTAL_SCREEN_SIZE) {
		throw new Error(
			`Invalid ZX Spectrum screen: File size (${bytes.length} bytes) is smaller than the required 6,912 bytes.`,
		);
	}

	// Support 128-byte tape emulator header (.sp / .tap dump)
	let dataOffset = 0;
	if (bytes.length >= 7040 && bytes.length < 8192) {
		dataOffset = 128;
	}

	const scale = Math.min(Math.max(Number(options.scale) || 1, 1), 8);
	const targetWidth = ZX_WIDTH * scale;
	const targetHeight = ZX_HEIGHT * scale;

	onProgress?.(0.2, "DECODE_ZX_SCREEN");

	let brightUsed = false;
	let flashUsed = false;
	const inkSet = new Set<number>();
	const paperSet = new Set<number>();

	const rgbaBuffer = new Uint8Array(targetWidth * targetHeight * 4);

	for (let y = 0; y < ZX_HEIGHT; y++) {
		// Non-linear interlaced Sinclair ZX screen memory address calculation:
		const third = y >> 6; // 0..2
		const rowInThird = (y >> 3) & 7; // 0..7
		const lineInChar = y & 7; // 0..7

		const rowOffset =
			dataOffset + third * 2048 + lineInChar * 256 + rowInThird * 32;
		const charRow = y >> 3; // 0..23
		const attrRowOffset = dataOffset + BITMAP_SIZE + charRow * 32;

		for (let c = 0; c < 32; c++) {
			const bitmapByte = bytes[rowOffset + c] ?? 0;
			const attrByte = bytes[attrRowOffset + c] ?? 0;

			const ink = attrByte & 0x07;
			const paper = (attrByte >> 3) & 0x07;
			const isBright = (attrByte & 0x40) !== 0;
			const isFlash = (attrByte & 0x80) !== 0;

			if (isBright) brightUsed = true;
			if (isFlash) flashUsed = true;
			inkSet.add(ink);
			paperSet.add(paper);

			const palette = isBright ? PALETTE_BRIGHT : PALETTE_NORMAL;

			for (let b = 0; b < 8; b++) {
				const bit = (bitmapByte >> (7 - b)) & 1;
				const isInk = options.invertColors ? bit === 0 : bit === 1;
				const colorIndex = isInk ? ink : paper;
				const [r = 0, g = 0, bVal = 0, a = 255] = palette[colorIndex] ??
					PALETTE_NORMAL[0] ?? [0, 0, 0, 255];

				const basePixelX = c * 8 + b;
				const basePixelY = y;

				// Handle pixel scaling
				for (let sy = 0; sy < scale; sy++) {
					const outY = basePixelY * scale + sy;
					const rowStart = outY * targetWidth * 4;

					for (let sx = 0; sx < scale; sx++) {
						const outX = basePixelX * scale + sx;
						const pixelOffset = rowStart + outX * 4;

						rgbaBuffer[pixelOffset] = r;
						rgbaBuffer[pixelOffset + 1] = g;
						rgbaBuffer[pixelOffset + 2] = bVal;
						rgbaBuffer[pixelOffset + 3] = a;
					}
				}
			}
		}

		if (y % 32 === 0 && onProgress) {
			onProgress(0.2 + (y / ZX_HEIGHT) * 0.6, "DECODING_RASTER");
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(targetWidth, targetHeight, rgbaBuffer);

	const metadata: ZxMetadata = {
		width: targetWidth,
		height: targetHeight,
		brightUsed,
		flashUsed,
		inkColorsUsed: Array.from(inkSet).sort((a, b) => a - b),
		paperColorsUsed: Array.from(paperSet).sort((a, b) => a - b),
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		pngBytes,
	};
}
