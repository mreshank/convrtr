import { encodeRgbaToPng } from "../dds/parser";
import { C64_COLODORE_PALETTE, C64_PEPTO_PALETTE } from "../koa/parser";
import type {
	ArtStudioConversionResult,
	ArtStudioMetadata,
	ArtStudioToPngOptions,
} from "./types";

const C64_COLS = 40;
const C64_ROWS = 25;
const C64_TOTAL_CELLS = C64_COLS * C64_ROWS; // 1,000 cells
const BITMAP_SIZE = C64_TOTAL_CELLS * 8; // 8,000 bytes
const SCREEN_RAM_SIZE = C64_TOTAL_CELLS; // 1,000 bytes
const COLOR_RAM_SIZE = C64_TOTAL_CELLS; // 1,000 bytes

/**
 * Parses and decodes a Commodore 64 Advanced Art Studio (.art) image file
 * (in Hires or Multicolor mode) into standard 32-bit RGBA PNG.
 */
export function convertArtStudioToPng(
	input: Uint8Array | ArrayBuffer,
	options: ArtStudioToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ArtStudioConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < BITMAP_SIZE + SCREEN_RAM_SIZE) {
		throw new Error(
			`Invalid Art Studio file: File size (${bytes.length} bytes) is smaller than the required 9,000 bytes for C64 bitmap data.`,
		);
	}

	let offset = 0;
	let loadAddress = 0x2000;

	// Check for 2-byte C64 PRG load address
	if (
		bytes.length === 9002 ||
		bytes.length === 9003 ||
		bytes.length === 10002 ||
		bytes.length === 10003
	) {
		loadAddress = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
		offset = 2;
	} else if (
		bytes.length > 10000 &&
		bytes[0] === 0x00 &&
		(bytes[1] === 0x20 || bytes[1] === 0x60)
	) {
		loadAddress = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
		offset = 2;
	}

	const dataLength = bytes.length - offset;
	const bitmapOffset = offset;
	const screenRamOffset = bitmapOffset + BITMAP_SIZE;
	const colorRamOffset = screenRamOffset + SCREEN_RAM_SIZE;

	// Determine Hires vs Multicolor mode
	let mode: "multicolor" | "hires" = "multicolor";
	if (options.mode === "hires") {
		mode = "hires";
	} else if (options.mode === "multicolor") {
		mode = "multicolor";
	} else {
		// Auto-detection: if file has no Color RAM chunk, it's Hires
		if (dataLength < BITMAP_SIZE + SCREEN_RAM_SIZE + COLOR_RAM_SIZE) {
			mode = "hires";
		} else {
			// Inspect Color RAM for variation
			const colorRamSample = bytes.subarray(
				colorRamOffset,
				colorRamOffset + Math.min(256, COLOR_RAM_SIZE),
			);
			const uniqueVals = new Set(colorRamSample);
			mode = uniqueVals.size > 1 ? "multicolor" : "multicolor";
		}
	}

	// Background color byte
	let bgColorIndex = 0;
	if (
		mode === "multicolor" &&
		dataLength >= BITMAP_SIZE + SCREEN_RAM_SIZE + COLOR_RAM_SIZE + 1
	) {
		bgColorIndex = (bytes[colorRamOffset + COLOR_RAM_SIZE] ?? 0) & 0x0f;
	}

	const palette =
		options.palette === "colodore" ? C64_COLODORE_PALETTE : C64_PEPTO_PALETTE;

	const scale = Math.min(Math.max(Number(options.scale) || 1, 1), 8);
	const targetWidth = 320 * scale;
	const targetHeight = 200 * scale;

	const rgba = new Uint8Array(targetWidth * targetHeight * 4);
	const colorsUsedSet = new Set<number>();
	if (mode === "multicolor") {
		colorsUsedSet.add(bgColorIndex);
	}

	onProgress?.(0.3, "DECODE_PIXELS");

	if (mode === "hires") {
		// C64 Hires mode: 320x200 monochrome per 8x8 character cell
		for (let cellY = 0; cellY < C64_ROWS; cellY++) {
			for (let cellX = 0; cellX < C64_COLS; cellX++) {
				const cellIndex = cellY * C64_COLS + cellX;
				const screenByte = bytes[screenRamOffset + cellIndex] ?? 0;
				const fgColor = (screenByte >> 4) & 0x0f;
				const bgColor = screenByte & 0x0f;

				colorsUsedSet.add(fgColor);
				colorsUsedSet.add(bgColor);

				for (let line = 0; line < 8; line++) {
					const y = cellY * 8 + line;
					const bitmapByte = bytes[bitmapOffset + cellIndex * 8 + line] ?? 0;

					for (let bit = 7; bit >= 0; bit--) {
						const pixelX = cellX * 8 + (7 - bit);
						const isFg = (bitmapByte & (1 << bit)) !== 0;
						const colorIdx = isFg ? fgColor : bgColor;
						const color = palette[colorIdx] ?? [0, 0, 0, 255];

						for (let sy = 0; sy < scale; sy++) {
							const outY = y * scale + sy;
							for (let sx = 0; sx < scale; sx++) {
								const outX = pixelX * scale + sx;
								const destIdx = (outY * targetWidth + outX) * 4;
								rgba[destIdx] = color[0];
								rgba[destIdx + 1] = color[1];
								rgba[destIdx + 2] = color[2];
								rgba[destIdx + 3] = color[3];
							}
						}
					}
				}
			}
		}
	} else {
		// C64 Multicolor mode: 160x200 (4 colors per cell, 2 bits per pixel)
		for (let cellY = 0; cellY < C64_ROWS; cellY++) {
			for (let cellX = 0; cellX < C64_COLS; cellX++) {
				const cellIndex = cellY * C64_COLS + cellX;
				const screenByte = bytes[screenRamOffset + cellIndex] ?? 0;
				const colorByte = bytes[colorRamOffset + cellIndex] ?? 0;

				const color00 = bgColorIndex;
				const color01 = (screenByte >> 4) & 0x0f;
				const color10 = screenByte & 0x0f;
				const color11 = colorByte & 0x0f;

				colorsUsedSet.add(color01);
				colorsUsedSet.add(color10);
				colorsUsedSet.add(color11);

				for (let line = 0; line < 8; line++) {
					const y = cellY * 8 + line;
					const bitmapByte = bytes[bitmapOffset + cellIndex * 8 + line] ?? 0;

					const pixelCodes = [
						(bitmapByte >> 6) & 0x03,
						(bitmapByte >> 4) & 0x03,
						(bitmapByte >> 2) & 0x03,
						bitmapByte & 0x03,
					];

					for (let p = 0; p < 4; p++) {
						const code = pixelCodes[p] ?? 0;
						let colorIdx = color00;
						if (code === 1) colorIdx = color01;
						else if (code === 2) colorIdx = color10;
						else if (code === 3) colorIdx = color11;

						const color = palette[colorIdx] ?? [0, 0, 0, 255];
						const pixelStartX = (cellX * 4 + p) * 2;

						for (let subX = 0; subX < 2; subX++) {
							const pixelX = pixelStartX + subX;
							for (let sy = 0; sy < scale; sy++) {
								const outY = y * scale + sy;
								for (let sx = 0; sx < scale; sx++) {
									const outX = pixelX * scale + sx;
									const destIdx = (outY * targetWidth + outX) * 4;
									rgba[destIdx] = color[0];
									rgba[destIdx + 1] = color[1];
									rgba[destIdx + 2] = color[2];
									rgba[destIdx + 3] = color[3];
								}
							}
						}
					}
				}
			}
		}
	}

	onProgress?.(0.8, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(targetWidth, targetHeight, rgba);

	const metadata: ArtStudioMetadata = {
		mode,
		width: targetWidth,
		height: targetHeight,
		loadAddress,
		backgroundColor: bgColorIndex,
		colorsUsed: Array.from(colorsUsedSet).sort((a, b) => a - b),
		palette: options.palette === "colodore" ? "colodore" : "pepto",
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		pngBytes,
		metadata,
	};
}
