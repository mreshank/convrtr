import { encodeRgbaToPng } from "../dds/parser";
import type {
	NeoConversionOptions,
	NeoConversionResult,
	NeoMetadata,
} from "./types";

/**
 * Parses Atari ST 12-bit RGB color word into [r, g, b] (0..255).
 * Supports both standard ST (3-bit per channel) and STE (4-bit per channel).
 */
function parseAtariColor(word: number): [number, number, number] {
	// Standard ST bits: R=8..10, G=4..6, B=0..2
	// STE extension bits: R_lsb=11, G_lsb=7, B_lsb=3
	const rSt = (word >> 8) & 0x07;
	const gSt = (word >> 4) & 0x07;
	const bSt = word & 0x07;

	const rSte = (word >> 11) & 0x01;
	const gSte = (word >> 7) & 0x01;
	const bSte = (word >> 3) & 0x01;

	// Check if STE bits are utilized
	const hasSte = (word & 0x0888) !== 0;

	if (hasSte) {
		const r = (rSt << 1) | rSte;
		const g = (gSt << 1) | gSte;
		const b = (bSt << 1) | bSte;
		return [
			Math.round((r / 15) * 255),
			Math.round((g / 15) * 255),
			Math.round((b / 15) * 255),
		];
	}

	return [
		Math.round((rSt / 7) * 255),
		Math.round((gSt / 7) * 255),
		Math.round((bSt / 7) * 255),
	];
}

/**
 * Converts an Atari ST NeoChrome (.neo) picture into a 32-bit RGBA PNG.
 */
export function convertNeoToPng(
	input: ArrayBuffer | Uint8Array,
	options: NeoConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): NeoConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 128) {
		throw new Error(
			"Invalid NEO file: Buffer size is smaller than the 128-byte NeoChrome header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Word 1: Resolution (0 = Low 320x200, 1 = Med 640x200, 2 = High 640x400)
	const resCode = view.getUint16(2, false); // Big-endian
	if (resCode > 2) {
		throw new Error(
			`Invalid NEO file: Unsupported resolution mode ${resCode}. Expected 0, 1, or 2.`,
		);
	}

	// Read 16-color palette from bytes 4..35
	const palette: Array<[number, number, number]> = [];
	for (let i = 0; i < 16; i++) {
		const colorWord = view.getUint16(4 + i * 2, false);
		palette.push(parseAtariColor(colorWord));
	}

	// Standard Atari ST screen RAM is 32,000 bytes
	const dataOffset = 128;
	const pixelData = bytes.subarray(dataOffset, dataOffset + 32000);

	onProgress?.(0.2, "DECODE_PIXELS");

	let width = 320;
	let height = 200;
	let resLabel: "low" | "medium" | "high" = "low";
	let rgba: Uint8Array;

	if (resCode === 0) {
		// Mode 0: 320x200, 16 colors (4 bitplanes)
		resLabel = "low";
		width = 320;
		height = 200;
		rgba = new Uint8Array(width * height * 4);

		let srcPtr = 0;
		for (let y = 0; y < height; y++) {
			for (let block = 0; block < 20; block++) {
				if (srcPtr + 8 > pixelData.length) break;

				const bp0 =
					((pixelData[srcPtr] ?? 0) << 8) | (pixelData[srcPtr + 1] ?? 0);
				const bp1 =
					((pixelData[srcPtr + 2] ?? 0) << 8) | (pixelData[srcPtr + 3] ?? 0);
				const bp2 =
					((pixelData[srcPtr + 4] ?? 0) << 8) | (pixelData[srcPtr + 5] ?? 0);
				const bp3 =
					((pixelData[srcPtr + 6] ?? 0) << 8) | (pixelData[srcPtr + 7] ?? 0);
				srcPtr += 8;

				for (let p = 0; p < 16; p++) {
					const shift = 15 - p;
					const idx =
						((bp0 >> shift) & 1) |
						(((bp1 >> shift) & 1) << 1) |
						(((bp2 >> shift) & 1) << 2) |
						(((bp3 >> shift) & 1) << 3);

					const [r, g, b] = palette[idx] ?? [0, 0, 0];
					const px = (y * width + block * 16 + p) * 4;
					rgba[px] = r;
					rgba[px + 1] = g;
					rgba[px + 2] = b;
					rgba[px + 3] = 255;
				}
			}
		}
	} else if (resCode === 1) {
		// Mode 1: 640x200, 4 colors (2 bitplanes)
		resLabel = "medium";
		width = 640;
		const nativeHeight = 200;
		const aspectCorrect = options.aspectCorrect ?? true;
		height = aspectCorrect ? 400 : 200;
		rgba = new Uint8Array(width * height * 4);

		let srcPtr = 0;
		for (let y = 0; y < nativeHeight; y++) {
			for (let block = 0; block < 40; block++) {
				if (srcPtr + 4 > pixelData.length) break;

				const bp0 =
					((pixelData[srcPtr] ?? 0) << 8) | (pixelData[srcPtr + 1] ?? 0);
				const bp1 =
					((pixelData[srcPtr + 2] ?? 0) << 8) | (pixelData[srcPtr + 3] ?? 0);
				srcPtr += 4;

				for (let p = 0; p < 16; p++) {
					const shift = 15 - p;
					const idx = ((bp0 >> shift) & 1) | (((bp1 >> shift) & 1) << 1);
					const [r, g, b] = palette[idx] ?? [0, 0, 0];

					if (aspectCorrect) {
						// Double each scanline vertically for 640x400 display
						const outY1 = y * 2;
						const outY2 = y * 2 + 1;
						const px1 = (outY1 * width + block * 16 + p) * 4;
						const px2 = (outY2 * width + block * 16 + p) * 4;
						rgba[px1] = r;
						rgba[px1 + 1] = g;
						rgba[px1 + 2] = b;
						rgba[px1 + 3] = 255;
						rgba[px2] = r;
						rgba[px2 + 1] = g;
						rgba[px2 + 2] = b;
						rgba[px2 + 3] = 255;
					} else {
						const px = (y * width + block * 16 + p) * 4;
						rgba[px] = r;
						rgba[px + 1] = g;
						rgba[px + 2] = b;
						rgba[px + 3] = 255;
					}
				}
			}
		}
	} else {
		// Mode 2: 640x400, 2 colors (1 bitplane monochrome)
		resLabel = "high";
		width = 640;
		height = 400;
		rgba = new Uint8Array(width * height * 4);

		let srcPtr = 0;
		for (let y = 0; y < height; y++) {
			for (let block = 0; block < 40; block++) {
				if (srcPtr + 2 > pixelData.length) break;

				const bp0 =
					((pixelData[srcPtr] ?? 0) << 8) | (pixelData[srcPtr + 1] ?? 0);
				srcPtr += 2;

				for (let p = 0; p < 16; p++) {
					const shift = 15 - p;
					const idx = (bp0 >> shift) & 1;
					const [r, g, b] = palette[idx] ?? [0, 0, 0];

					const px = (y * width + block * 16 + p) * 4;
					rgba[px] = r;
					rgba[px + 1] = g;
					rgba[px + 2] = b;
					rgba[px + 3] = 255;
				}
			}
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(width, height, rgba);
	onProgress?.(1.0, "COMPLETE");

	const metadata: NeoMetadata = {
		resolution: resLabel,
		width,
		height,
		palette,
	};

	return {
		metadata,
		pngBytes,
	};
}
