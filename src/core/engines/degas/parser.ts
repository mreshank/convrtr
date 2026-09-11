import { encodeRgbaToPng } from "../dds/parser";
import type {
	DegasConversionResult,
	DegasMetadata,
	DegasToPngOptions,
} from "./types";

const ATARI_BITMAP_SIZE = 32000;

function decompressPackbits(
	compressed: Uint8Array,
	targetLength = ATARI_BITMAP_SIZE,
): Uint8Array {
	const out = new Uint8Array(targetLength);
	let inPos = 0;
	let outPos = 0;

	while (inPos < compressed.length && outPos < targetLength) {
		const b = compressed[inPos++];
		if (b === undefined) break;

		if (b < 128) {
			const count = b + 1;
			for (
				let i = 0;
				i < count && outPos < targetLength && inPos < compressed.length;
				i++
			) {
				out[outPos++] = compressed[inPos++] ?? 0;
			}
		} else if (b > 128) {
			const count = 257 - b;
			const val = compressed[inPos++] ?? 0;
			for (let i = 0; i < count && outPos < targetLength; i++) {
				out[outPos++] = val;
			}
		}
	}

	return out;
}

/**
 * Parses and decodes an Atari ST DEGAS (.pi1, .pi2, .pi3) or DEGAS Elite (.pc1, .pc2, .pc3) file
 * into a lossless 32-bit RGBA PNG.
 */
export function convertDegasToPng(
	input: Uint8Array | ArrayBuffer,
	options: DegasToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): DegasConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 34) {
		throw new Error(
			`Invalid DEGAS file: File size (${bytes.length} bytes) is too small to contain a 34-byte DEGAS header.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const rawMode = view.getUint16(0, false);
	const resolutionMode = rawMode & 0x03; // 0 = Low, 1 = Medium, 2 = High
	const isCompressed = bytes.length < 32034 || (rawMode & 0x8000) !== 0;

	// Extract 16-color palette (Atari ST 9-bit RGB: 3 bits per channel)
	const palette: [number, number, number, number][] = [];
	for (let i = 0; i < 16; i++) {
		const word = view.getUint16(2 + i * 2, false);
		const r3 = (word >> 8) & 0x07;
		const g3 = (word >> 4) & 0x07;
		const b3 = word & 0x07;

		const r = Math.round((r3 / 7) * 255);
		const g = Math.round((g3 / 7) * 255);
		const b = Math.round((b3 / 7) * 255);
		palette.push([r, g, b, 255]);
	}

	onProgress?.(0.15, "DECOMPRESS_BITMAP");
	let bitmapData: Uint8Array;
	if (isCompressed) {
		bitmapData = decompressPackbits(bytes.subarray(34));
	} else {
		bitmapData = bytes.subarray(34, 34 + ATARI_BITMAP_SIZE);
		if (bitmapData.length < ATARI_BITMAP_SIZE) {
			const padded = new Uint8Array(ATARI_BITMAP_SIZE);
			padded.set(bitmapData);
			bitmapData = padded;
		}
	}

	const bitmapView = new DataView(
		bitmapData.buffer,
		bitmapData.byteOffset,
		bitmapData.byteLength,
	);

	const uniqueColors = new Set<number>();
	let targetWidth = 320;
	let targetHeight = 200;
	let resolutionName = "Low Resolution (320x200 16 Colors)";
	let rgbaBuffer: Uint8Array;

	const scale = Number(options.scale) === 2 ? 2 : 1;

	onProgress?.(0.3, "DECODE_PIXELS");

	if (resolutionMode === 0) {
		// Low Res: 320x200, 16 colors, 4 interleaved bitplanes
		targetWidth = 320 * scale;
		targetHeight = 200 * scale;
		resolutionName = "Low Resolution (320x200 16 Colors)";
		rgbaBuffer = new Uint8Array(targetWidth * targetHeight * 4);

		for (let y = 0; y < 200; y++) {
			const lineOffset = y * 160;

			for (let chunk = 0; chunk < 20; chunk++) {
				const chunkOffset = lineOffset + chunk * 8;
				const w0 = bitmapView.getUint16(chunkOffset, false);
				const w1 = bitmapView.getUint16(chunkOffset + 2, false);
				const w2 = bitmapView.getUint16(chunkOffset + 4, false);
				const w3 = bitmapView.getUint16(chunkOffset + 6, false);

				for (let p = 0; p < 16; p++) {
					const shift = 15 - p;
					const b0 = (w0 >> shift) & 1;
					const b1 = (w1 >> shift) & 1;
					const b2 = (w2 >> shift) & 1;
					const b3 = (w3 >> shift) & 1;
					const colorIdx = (b3 << 3) | (b2 << 2) | (b1 << 1) | b0;
					uniqueColors.add(colorIdx);

					const [r = 0, g = 0, b = 0, a = 255] = palette[colorIdx] ??
						palette[0] ?? [0, 0, 0, 255];

					const basePixelX = chunk * 16 + p;

					for (let sy = 0; sy < scale; sy++) {
						const outY = y * scale + sy;
						const rowStart = outY * targetWidth * 4;

						for (let sx = 0; sx < scale; sx++) {
							const outX = basePixelX * scale + sx;
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
	} else if (resolutionMode === 1) {
		// Medium Res: 640x200, 4 colors, 2 interleaved bitplanes
		// In Atari ST, medium res is displayed at 640x400 (lines doubled vertically)
		targetWidth = 640;
		targetHeight = 400;
		resolutionName = "Medium Resolution (640x200 4 Colors)";
		rgbaBuffer = new Uint8Array(targetWidth * targetHeight * 4);

		for (let y = 0; y < 200; y++) {
			const lineOffset = y * 160;

			for (let chunk = 0; chunk < 40; chunk++) {
				const chunkOffset = lineOffset + chunk * 4;
				const w0 = bitmapView.getUint16(chunkOffset, false);
				const w1 = bitmapView.getUint16(chunkOffset + 2, false);

				for (let p = 0; p < 16; p++) {
					const shift = 15 - p;
					const b0 = (w0 >> shift) & 1;
					const b1 = (w1 >> shift) & 1;
					const colorIdx = (b1 << 1) | b0;
					uniqueColors.add(colorIdx);

					const [r = 0, g = 0, b = 0, a = 255] = palette[colorIdx] ??
						palette[0] ?? [0, 0, 0, 255];

					const outX = chunk * 16 + p;

					// Double lines vertically to achieve 640x400 native aspect
					for (let sy = 0; sy < 2; sy++) {
						const outY = y * 2 + sy;
						const offset = (outY * targetWidth + outX) * 4;

						rgbaBuffer[offset] = r;
						rgbaBuffer[offset + 1] = g;
						rgbaBuffer[offset + 2] = b;
						rgbaBuffer[offset + 3] = a;
					}
				}
			}
		}
	} else {
		// High Res: 640x400 monochrome, 1 bitplane (80 bytes per scanline)
		targetWidth = 640;
		targetHeight = 400;
		resolutionName = "High Resolution (640x400 Monochrome)";
		rgbaBuffer = new Uint8Array(targetWidth * targetHeight * 4);

		const colorWhite: [number, number, number, number] = palette[0] ?? [
			255, 255, 255, 255,
		];
		const colorBlack: [number, number, number, number] = palette[1] ?? [
			0, 0, 0, 255,
		];

		for (let y = 0; y < 400; y++) {
			const lineOffset = y * 80;

			for (let chunk = 0; chunk < 40; chunk++) {
				const w0 = bitmapView.getUint16(lineOffset + chunk * 2, false);

				for (let p = 0; p < 16; p++) {
					const bit = (w0 >> (15 - p)) & 1;
					uniqueColors.add(bit);

					const [r, g, b, a] = bit === 1 ? colorBlack : colorWhite;
					const outX = chunk * 16 + p;
					const offset = (y * targetWidth + outX) * 4;

					rgbaBuffer[offset] = r;
					rgbaBuffer[offset + 1] = g;
					rgbaBuffer[offset + 2] = b;
					rgbaBuffer[offset + 3] = a;
				}
			}
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(targetWidth, targetHeight, rgbaBuffer);

	const metadata: DegasMetadata = {
		resolutionMode,
		resolutionName,
		width: targetWidth,
		height: targetHeight,
		compressed: isCompressed,
		colorsUsed: uniqueColors.size,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		pngBytes,
	};
}
