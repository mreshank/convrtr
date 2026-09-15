import { encodeRgbaToPng } from "../dds/parser";
import type {
	CpcConversionResult,
	CpcGraphicsMode,
	CpcMetadata,
	CpcToPngOptions,
} from "./types";

// CPC Gate Array 27-color Hardware Palette (R, G, B, A)
// Levels: 0 = 0, 1 = 128, 2 = 255
export const CPC_HARDWARE_PALETTE: readonly [number, number, number, number][] =
	[
		[0, 0, 0, 255], // 0: Black
		[0, 0, 128, 255], // 1: Blue
		[0, 0, 255, 255], // 2: Bright Blue
		[128, 0, 0, 255], // 3: Red
		[128, 0, 128, 255], // 4: Magenta
		[128, 0, 255, 255], // 5: Mauve
		[255, 0, 0, 255], // 6: Bright Red
		[255, 0, 128, 255], // 7: Purple
		[255, 0, 255, 255], // 8: Bright Magenta
		[0, 128, 0, 255], // 9: Green
		[0, 128, 128, 255], // 10: Cyan
		[0, 128, 255, 255], // 11: Sky Blue
		[128, 128, 0, 255], // 12: Yellow
		[128, 128, 128, 255], // 13: Pastel Blue / White
		[128, 128, 255, 255], // 14: Pastel Green
		[255, 128, 0, 255], // 15: Orange
		[255, 128, 128, 255], // 16: Pink
		[255, 128, 255, 255], // 17: Pastel Magenta
		[0, 255, 0, 255], // 18: Bright Green
		[0, 255, 128, 255], // 19: Sea Green
		[0, 255, 255, 255], // 20: Bright Cyan
		[128, 255, 0, 255], // 21: Lime
		[128, 255, 128, 255], // 22: Pastel Green
		[128, 255, 255, 255], // 23: Pastel Cyan
		[255, 255, 0, 255], // 24: Bright Yellow
		[255, 255, 128, 255], // 25: Pastel Yellow
		[255, 255, 255, 255], // 26: Bright White
	];

// Default CPC firmware pen colors (hardware color numbers)
export const DEFAULT_MODE0_PENS: readonly number[] = [
	1, 24, 20, 6, 26, 0, 2, 8, 10, 12, 13, 16, 18, 15, 5, 21,
];

export const DEFAULT_MODE1_PENS: readonly number[] = [1, 24, 20, 6];

export const DEFAULT_MODE2_PENS: readonly number[] = [0, 26];

const CPC_SCREEN_RAM_SIZE = 16384;
const AMSDOS_HEADER_SIZE = 128;

interface ParsedAmsdosHeader {
	hasHeader: boolean;
	filename?: string;
	offset: number;
}

function parseAmsdosHeader(bytes: Uint8Array): ParsedAmsdosHeader {
	if (bytes.length < CPC_SCREEN_RAM_SIZE + AMSDOS_HEADER_SIZE) {
		return { hasHeader: false, offset: 0 };
	}

	// Verify 16-bit checksum of bytes 0..66
	let sum = 0;
	for (let i = 0; i < 67; i++) {
		sum += bytes[i] ?? 0;
	}
	const expectedSum = (bytes[67] ?? 0) | ((bytes[68] ?? 0) << 8);

	if ((sum & 0xffff) !== expectedSum) {
		return { hasHeader: false, offset: 0 };
	}

	// Extract filename: bytes 1..8 and extension 9..11
	let name = "";
	for (let i = 1; i <= 8; i++) {
		const charCode = bytes[i] ?? 32;
		if (charCode > 32 && charCode <= 126) {
			name += String.fromCharCode(charCode);
		}
	}
	let ext = "";
	for (let i = 9; i <= 11; i++) {
		const charCode = bytes[i] ?? 32;
		if (charCode > 32 && charCode <= 126) {
			ext += String.fromCharCode(charCode);
		}
	}

	const filename = ext ? `${name}.${ext}` : name;
	return {
		hasHeader: true,
		filename: filename.trim(),
		offset: AMSDOS_HEADER_SIZE,
	};
}

export function parseCpcScreen(
	input: Uint8Array | ArrayBuffer,
	options: CpcToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): CpcConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < CPC_SCREEN_RAM_SIZE) {
		throw new Error(
			`Invalid Amstrad CPC screen file: Size (${bytes.length} bytes) is less than standard 16,384 bytes.`,
		);
	}

	const amsdos = parseAmsdosHeader(bytes);
	const dataOffset = amsdos.offset;

	const mode: CpcGraphicsMode = options.mode ?? 0;
	const aspectCorrection = options.aspectCorrection !== false;

	let defaultPens: readonly number[];
	if (mode === 0) {
		defaultPens = DEFAULT_MODE0_PENS;
	} else if (mode === 1) {
		defaultPens = DEFAULT_MODE1_PENS;
	} else {
		defaultPens = DEFAULT_MODE2_PENS;
	}

	const paletteIndices =
		options.customPalette && options.customPalette.length > 0
			? options.customPalette
			: defaultPens;

	onProgress?.(0.3, "DECODE_PIXELS");

	const outputHeight = 200;
	let outputWidth: number;
	if (mode === 0) {
		outputWidth = aspectCorrection ? 320 : 160;
	} else if (mode === 1) {
		outputWidth = 320;
	} else {
		outputWidth = 640;
	}

	const rgba = new Uint8Array(outputWidth * outputHeight * 4);

	// Motorola 6845 CRTC memory layout:
	// y = 0..199:
	// lineInChar = y % 8
	// charRow = Math.floor(y / 8)
	// lineOffset = (lineInChar * 0x800) + (charRow * 80)
	for (let y = 0; y < 200; y++) {
		const lineInChar = y % 8;
		const charRow = Math.floor(y / 8);
		const lineOffset = dataOffset + lineInChar * 0x800 + charRow * 80;

		for (let byteX = 0; byteX < 80; byteX++) {
			const b = bytes[lineOffset + byteX] ?? 0;

			if (mode === 0) {
				// Mode 0: 2 pixels per byte (4 bits per pixel)
				const p0 =
					(b & 0x80 ? 1 : 0) |
					(b & 0x08 ? 2 : 0) |
					(b & 0x20 ? 4 : 0) |
					(b & 0x02 ? 8 : 0);
				const p1 =
					(b & 0x40 ? 1 : 0) |
					(b & 0x04 ? 2 : 0) |
					(b & 0x10 ? 4 : 0) |
					(b & 0x01 ? 8 : 0);

				const col0 = CPC_HARDWARE_PALETTE[
					paletteIndices[p0 % paletteIndices.length] ?? 0
				] ?? [0, 0, 0, 255];
				const col1 = CPC_HARDWARE_PALETTE[
					paletteIndices[p1 % paletteIndices.length] ?? 0
				] ?? [0, 0, 0, 255];

				const rawX = byteX * 2;
				if (aspectCorrection) {
					// Each Mode 0 pixel is 2 pixels wide in 320x200
					const destX0 = rawX * 2;
					const off0a = (y * outputWidth + destX0) * 4;
					const off0b = (y * outputWidth + destX0 + 1) * 4;
					rgba[off0a] = col0[0];
					rgba[off0a + 1] = col0[1];
					rgba[off0a + 2] = col0[2];
					rgba[off0a + 3] = 255;
					rgba[off0b] = col0[0];
					rgba[off0b + 1] = col0[1];
					rgba[off0b + 2] = col0[2];
					rgba[off0b + 3] = 255;

					const destX1 = (rawX + 1) * 2;
					const off1a = (y * outputWidth + destX1) * 4;
					const off1b = (y * outputWidth + destX1 + 1) * 4;
					rgba[off1a] = col1[0];
					rgba[off1a + 1] = col1[1];
					rgba[off1a + 2] = col1[2];
					rgba[off1a + 3] = 255;
					rgba[off1b] = col1[0];
					rgba[off1b + 1] = col1[1];
					rgba[off1b + 2] = col1[2];
					rgba[off1b + 3] = 255;
				} else {
					const off0 = (y * outputWidth + rawX) * 4;
					const off1 = (y * outputWidth + rawX + 1) * 4;
					rgba[off0] = col0[0];
					rgba[off0 + 1] = col0[1];
					rgba[off0 + 2] = col0[2];
					rgba[off0 + 3] = 255;
					rgba[off1] = col1[0];
					rgba[off1 + 1] = col1[1];
					rgba[off1 + 2] = col1[2];
					rgba[off1 + 3] = 255;
				}
			} else if (mode === 1) {
				// Mode 1: 4 pixels per byte (2 bits per pixel)
				const p0 = (b & 0x80 ? 1 : 0) | (b & 0x08 ? 2 : 0);
				const p1 = (b & 0x40 ? 1 : 0) | (b & 0x04 ? 2 : 0);
				const p2 = (b & 0x20 ? 1 : 0) | (b & 0x02 ? 2 : 0);
				const p3 = (b & 0x10 ? 1 : 0) | (b & 0x01 ? 2 : 0);

				const pixels = [p0, p1, p2, p3];
				for (let pi = 0; pi < 4; pi++) {
					const pen = pixels[pi] ?? 0;
					const col = CPC_HARDWARE_PALETTE[
						paletteIndices[pen % paletteIndices.length] ?? 0
					] ?? [0, 0, 0, 255];
					const destX = byteX * 4 + pi;
					const off = (y * outputWidth + destX) * 4;
					rgba[off] = col[0];
					rgba[off + 1] = col[1];
					rgba[off + 2] = col[2];
					rgba[off + 3] = 255;
				}
			} else {
				// Mode 2: 8 pixels per byte (1 bit per pixel)
				for (let pi = 0; pi < 8; pi++) {
					const pen = (b >> (7 - pi)) & 1;
					const col = CPC_HARDWARE_PALETTE[
						paletteIndices[pen % paletteIndices.length] ?? 0
					] ?? [0, 0, 0, 255];
					const destX = byteX * 8 + pi;
					const off = (y * outputWidth + destX) * 4;
					rgba[off] = col[0];
					rgba[off + 1] = col[1];
					rgba[off + 2] = col[2];
					rgba[off + 3] = 255;
				}
			}
		}
	}

	onProgress?.(0.8, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(outputWidth, outputHeight, rgba);
	const pngBuffer = pngBytes.buffer.slice(
		pngBytes.byteOffset,
		pngBytes.byteOffset + pngBytes.byteLength,
	) as ArrayBuffer;

	onProgress?.(1.0, "COMPLETE");

	const metadata: CpcMetadata = {
		width: outputWidth,
		height: outputHeight,
		mode,
		hasAmsdosHeader: amsdos.hasHeader,
		amsdosFilename: amsdos.filename,
		paletteUsed: [...paletteIndices],
	};

	return {
		pngBuffer,
		metadata,
	};
}
