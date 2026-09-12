import { encodeRgbaToPng } from "../dds/parser";
import type {
	ChrConversionResult,
	ChrMetadata,
	ChrToPngOptions,
} from "./types";

const PALETTES: Record<string, [number, number, number, number][]> = {
	grayscale: [
		[255, 255, 255, 255],
		[170, 170, 170, 255],
		[85, 85, 85, 255],
		[0, 0, 0, 255],
	],
	gameboy: [
		[224, 248, 208, 255],
		[136, 192, 112, 255],
		[52, 104, 86, 255],
		[8, 24, 32, 255],
	],
	mario: [
		[255, 255, 255, 0], // Transparent
		[252, 152, 56, 255],
		[184, 34, 0, 255],
		[116, 116, 116, 255],
	],
};

const TILES_PER_ROW = 16;

/**
 * Parses raw Nintendo NES 2bpp CHR tile data (.chr) and exports a 32-bit RGBA PNG sprite sheet.
 */
export function convertChrToPng(
	input: Uint8Array | ArrayBuffer,
	options: ChrToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ChrConversionResult {
	onProgress?.(0.05, "READ_INPUT");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 16) {
		throw new Error(
			`Invalid CHR file: File size (${bytes.length} bytes) must be at least 16 bytes for a single 8x8 tile.`,
		);
	}

	const tileCount = Math.floor(bytes.length / 16);
	const rows = Math.ceil(tileCount / TILES_PER_ROW);

	const baseWidth = TILES_PER_ROW * 8; // 128 px
	const baseHeight = rows * 8;

	const scale =
		typeof options.scale === "number"
			? options.scale
			: Number.parseInt(String(options.scale ?? "1"), 10) || 1;
	const safeScale = scale === 4 ? 4 : scale === 2 ? 2 : 1;

	const targetWidth = baseWidth * safeScale;
	const targetHeight = baseHeight * safeScale;

	const paletteKey = options.palette ?? "grayscale";
	const palette = PALETTES[paletteKey] ?? PALETTES.grayscale ?? [];

	onProgress?.(0.2, "DECODE_TILES");
	const rgbaBuffer = new Uint8Array(targetWidth * targetHeight * 4);

	for (let t = 0; t < tileCount; t++) {
		const tileOffset = t * 16;
		const tileX = (t % TILES_PER_ROW) * 8;
		const tileY = Math.floor(t / TILES_PER_ROW) * 8;

		// Decode 8 rows of the 8x8 tile
		for (let row = 0; row < 8; row++) {
			const plane0 = bytes[tileOffset + row] ?? 0;
			const plane1 = bytes[tileOffset + 8 + row] ?? 0;

			for (let col = 0; col < 8; col++) {
				const shift = 7 - col;
				const bit0 = (plane0 >> shift) & 1;
				const bit1 = (plane1 >> shift) & 1;
				const colorIndex = (bit1 << 1) | bit0;

				const [r = 0, g = 0, b = 0, a = 255] = palette[colorIndex] ?? [
					0, 0, 0, 255,
				];

				const pixelX = tileX + col;
				const pixelY = tileY + row;

				// Write scaled pixel block
				for (let sy = 0; sy < safeScale; sy++) {
					const outY = pixelY * safeScale + sy;
					const rowStart = outY * targetWidth * 4;

					for (let sx = 0; sx < safeScale; sx++) {
						const outX = pixelX * safeScale + sx;
						const offset = rowStart + outX * 4;

						rgbaBuffer[offset] = r;
						rgbaBuffer[offset + 1] = g;
						rgbaBuffer[offset + 2] = b;
						rgbaBuffer[offset + 3] = a;
					}
				}
			}
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(targetWidth, targetHeight, rgbaBuffer);

	const metadata: ChrMetadata = {
		tileCount,
		width: targetWidth,
		height: targetHeight,
		paletteName: paletteKey,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		pngBytes,
	};
}
