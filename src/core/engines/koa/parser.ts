import { encodeRgbaToPng } from "../dds/parser";
import type {
	KoaConversionResult,
	KoaMetadata,
	KoaToPngOptions,
} from "./types";

const C64_COLS = 40;
const C64_ROWS = 25;
const C64_TOTAL_CELLS = C64_COLS * C64_ROWS; // 1000 cells
const BITMAP_SIZE = C64_TOTAL_CELLS * 8; // 8000 bytes
const SCREEN_RAM_SIZE = C64_TOTAL_CELLS; // 1000 bytes
const COLOR_RAM_SIZE = C64_TOTAL_CELLS; // 1000 bytes
const KOA_RAW_SIZE = BITMAP_SIZE + SCREEN_RAM_SIZE + COLOR_RAM_SIZE + 1; // 10001 bytes
const KOA_PRG_SIZE = 2 + KOA_RAW_SIZE; // 10003 bytes

export const C64_PEPTO_PALETTE: [number, number, number, number][] = [
	[0x00, 0x00, 0x00, 255], // 0: Black
	[0xff, 0xff, 0xff, 255], // 1: White
	[0x88, 0x00, 0x00, 255], // 2: Red
	[0xaa, 0xff, 0xee, 255], // 3: Cyan
	[0xcc, 0x44, 0xcc, 255], // 4: Purple
	[0x00, 0xcc, 0x55, 255], // 5: Green
	[0x00, 0x00, 0xaa, 255], // 6: Blue
	[0xee, 0xee, 0x77, 255], // 7: Yellow
	[0xdd, 0x88, 0x55, 255], // 8: Orange
	[0x66, 0x44, 0x00, 255], // 9: Brown
	[0xff, 0x77, 0x77, 255], // 10: Light Red
	[0x33, 0x33, 0x33, 255], // 11: Dark Grey
	[0x77, 0x77, 0x77, 255], // 12: Medium Grey
	[0xaa, 0xff, 0x66, 255], // 13: Light Green
	[0x00, 0x88, 0xff, 255], // 14: Light Blue
	[0xbb, 0xbb, 0xbb, 255], // 15: Light Grey
];

export const C64_COLODORE_PALETTE: [number, number, number, number][] = [
	[0x00, 0x00, 0x00, 255], // 0: Black
	[0xff, 0xff, 0xff, 255], // 1: White
	[0x81, 0x33, 0x38, 255], // 2: Red
	[0x75, 0xce, 0xc8, 255], // 3: Cyan
	[0x8e, 0x3c, 0x97, 255], // 4: Purple
	[0x56, 0xac, 0x4d, 255], // 5: Green
	[0x2e, 0x2c, 0x9b, 255], // 6: Blue
	[0xed, 0xf1, 0x71, 255], // 7: Yellow
	[0x8e, 0x50, 0x29, 255], // 8: Orange
	[0x55, 0x38, 0x00, 255], // 9: Brown
	[0xc4, 0x6c, 0x71, 255], // 10: Light Red
	[0x4a, 0x4a, 0x4a, 255], // 11: Dark Grey
	[0x7b, 0x7b, 0x7b, 255], // 12: Medium Grey
	[0xa9, 0xff, 0x9f, 255], // 13: Light Green
	[0x70, 0x6d, 0xeb, 255], // 14: Light Blue
	[0xb2, 0xb2, 0xb2, 255], // 15: Light Grey
];

/**
 * Parses and decodes a Commodore 64 KoalaPainter (.koa) multi-color graphic file
 * into a standard 32-bit RGBA PNG.
 */
export function convertKoaToPng(
	input: Uint8Array | ArrayBuffer,
	options: KoaToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): KoaConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < KOA_RAW_SIZE) {
		throw new Error(
			`Invalid KoalaPainter file: File size (${bytes.length} bytes) is smaller than required 10,001 bytes.`,
		);
	}

	let offset = 0;
	let loadAddress = 0x6000;

	if (bytes.length >= KOA_PRG_SIZE) {
		loadAddress = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
		offset = 2;
	}

	const bitmapOffset = offset;
	const screenRamOffset = bitmapOffset + BITMAP_SIZE;
	const colorRamOffset = screenRamOffset + SCREEN_RAM_SIZE;
	const bgColorIndex = (bytes[colorRamOffset + COLOR_RAM_SIZE] ?? 0) & 0x0f;

	const palette =
		options.palette === "colodore" ? C64_COLODORE_PALETTE : C64_PEPTO_PALETTE;

	const scale = Math.min(Math.max(Number(options.scale) || 1, 1), 8);
	const targetWidth = 320 * scale;
	const targetHeight = 200 * scale;

	const rgba = new Uint8Array(targetWidth * targetHeight * 4);
	const colorsUsedSet = new Set<number>();
	colorsUsedSet.add(bgColorIndex);

	onProgress?.(0.3, "DECODE_PIXELS");

	// In C64 Multi-Color Bitmap mode:
	// 40 columns x 25 rows of 8x8 character cells.
	// In each cell, pixels are 2 bits each (4 pixels per scanline in 8 bits).
	// Pixel value mappings:
	// 00 -> Background color (D021)
	// 01 -> Upper nibble of Screen RAM for this cell
	// 10 -> Lower nibble of Screen RAM for this cell
	// 11 -> Lower nibble of Color RAM for this cell
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

				// 4 double-wide pixels per byte
				const pixelBits = [
					(bitmapByte >> 6) & 0x03,
					(bitmapByte >> 4) & 0x03,
					(bitmapByte >> 2) & 0x03,
					bitmapByte & 0x03,
				];

				for (let p = 0; p < 4; p++) {
					const code = pixelBits[p] ?? 0;
					let colorIdx = color00;
					if (code === 1) colorIdx = color01;
					else if (code === 2) colorIdx = color10;
					else if (code === 3) colorIdx = color11;

					const color = palette[colorIdx] ?? [0, 0, 0, 255];
					// Each multi-color pixel is 2 C64 raster pixels wide
					const baseX = (cellX * 4 + p) * 2;

					// Fill scaled block (2*scale wide x scale tall)
					for (let sy = 0; sy < scale; sy++) {
						const destY = y * scale + sy;
						for (let sx = 0; sx < scale * 2; sx++) {
							const destX = baseX * scale + sx;
							const destOffset = (destY * targetWidth + destX) * 4;
							rgba[destOffset] = color[0];
							rgba[destOffset + 1] = color[1];
							rgba[destOffset + 2] = color[2];
							rgba[destOffset + 3] = color[3];
						}
					}
				}
			}
		}
	}

	onProgress?.(0.8, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(targetWidth, targetHeight, rgba);
	onProgress?.(1.0, "COMPLETE");

	const metadata: KoaMetadata = {
		width: targetWidth,
		height: targetHeight,
		loadAddress,
		backgroundColor: bgColorIndex,
		uniqueColorsUsed: Array.from(colorsUsedSet).sort((a, b) => a - b),
	};

	return {
		metadata,
		pngBytes,
	};
}
