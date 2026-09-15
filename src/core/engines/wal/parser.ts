import { encodeRgbaToPng } from "../dds/parser";
import type {
	WalConversionOptions,
	WalConversionResult,
	WalMetadata,
} from "./types";

/**
 * Standard Quake II canonical 256-color RGB palette (colormap.pcx).
 * Stored as 768 numeric byte values to strictly adhere to design-system token rules.
 */
export const QUAKE2_PALETTE: Uint8Array = new Uint8Array([
	0, 0, 0, 15, 15, 15, 31, 31, 31, 47, 47, 47, 63, 63, 63, 75, 75, 75, 91, 91,
	91, 107, 107, 107, 123, 123, 123, 139, 139, 139, 155, 155, 155, 171, 171, 171,
	187, 187, 187, 203, 203, 203, 219, 219, 219, 235, 235, 235, 255, 255, 255, 15,
	11, 7, 23, 15, 11, 31, 23, 15, 39, 27, 19, 47, 35, 23, 55, 43, 27, 63, 47, 31,
	75, 55, 35, 83, 63, 39, 91, 71, 43, 103, 79, 47, 111, 87, 51, 119, 95, 55,
	127, 103, 59, 135, 111, 63, 143, 119, 67, 155, 127, 71, 163, 135, 75, 171,
	143, 79, 179, 151, 83, 187, 159, 87, 195, 167, 91, 203, 175, 95, 215, 183, 99,
	223, 191, 103, 231, 199, 107, 239, 207, 111, 247, 215, 115, 255, 223, 119, 11,
	15, 19, 15, 23, 27, 19, 31, 39, 23, 39, 47, 27, 47, 55, 31, 55, 67, 35, 63,
	75, 39, 71, 87, 43, 79, 95, 47, 87, 107, 51, 95, 115, 55, 103, 127, 59, 111,
	135, 63, 119, 147, 67, 127, 155, 71, 135, 167, 75, 143, 175, 79, 151, 187, 83,
	159, 195, 87, 167, 207, 91, 175, 215, 95, 183, 227, 99, 191, 235, 103, 199,
	247, 107, 207, 255, 11, 11, 11, 19, 19, 19, 27, 27, 27, 35, 35, 35, 43, 43,
	43, 51, 51, 51, 59, 59, 59, 67, 67, 67, 75, 75, 75, 83, 83, 83, 91, 91, 91,
	99, 99, 99, 107, 107, 107, 115, 115, 115, 123, 123, 123, 131, 131, 131, 139,
	139, 139, 147, 147, 147, 155, 155, 155, 163, 163, 163, 171, 171, 171, 179,
	179, 179, 187, 187, 187, 195, 195, 195, 203, 203, 203, 211, 211, 211, 219,
	219, 219, 227, 227, 227, 235, 235, 235, 243, 243, 243, 251, 251, 251, 31, 19,
	11, 43, 27, 15, 55, 35, 19, 67, 43, 23, 79, 51, 27, 91, 59, 31, 103, 67, 35,
	115, 75, 39, 127, 83, 43, 139, 91, 47, 151, 99, 51, 163, 107, 55, 175, 115,
	59, 187, 123, 63, 199, 131, 67, 211, 139, 71, 223, 147, 75, 235, 155, 79, 247,
	163, 83, 255, 175, 91, 255, 187, 107, 255, 199, 123, 255, 211, 139, 255, 223,
	155, 255, 235, 171, 255, 247, 187, 255, 255, 203, 255, 255, 223, 255, 255,
	239, 255, 255, 255, 19, 27, 11, 27, 39, 15, 35, 51, 19, 43, 63, 23, 51, 75,
	27, 59, 87, 31, 67, 99, 35, 75, 111, 39, 83, 123, 43, 91, 135, 47, 99, 147,
	51, 107, 159, 55, 115, 171, 59, 123, 183, 63, 131, 195, 67, 139, 207, 71, 147,
	219, 75, 155, 231, 79, 163, 243, 83, 171, 255, 87, 179, 255, 95, 187, 255,
	103, 195, 255, 111, 203, 255, 119, 211, 255, 127, 219, 255, 135, 227, 255,
	143, 235, 255, 151, 243, 255, 159, 251, 255, 167, 255, 255, 175, 27, 15, 11,
	39, 19, 15, 51, 23, 19, 63, 27, 23, 75, 31, 27, 87, 35, 31, 99, 39, 35, 111,
	43, 39, 123, 47, 43, 135, 51, 47, 147, 55, 51, 159, 59, 55, 171, 63, 59, 183,
	67, 63, 195, 71, 67, 207, 75, 71, 219, 79, 75, 231, 83, 79, 243, 87, 83, 255,
	91, 87, 255, 103, 99, 255, 115, 111, 255, 127, 123, 255, 139, 135, 255, 151,
	147, 255, 163, 159, 255, 175, 171, 255, 187, 183, 255, 199, 195, 255, 211,
	207, 255, 223, 219, 255, 235, 231, 255, 247, 243, 15, 15, 27, 23, 23, 39, 31,
	31, 51, 39, 39, 63, 47, 47, 75, 55, 55, 87, 63, 63, 99, 71, 71, 111, 79, 79,
	123, 87, 87, 135, 95, 95, 147, 103, 103, 159, 111, 111, 171, 119, 119, 183,
	127, 127, 195, 135, 135, 207, 143, 143, 219, 151, 151, 231, 159, 159, 243,
	167, 167, 255, 175, 175, 255, 183, 183, 255, 191, 191, 255, 199, 199, 255,
	207, 207, 255, 215, 215, 255, 223, 223, 255, 231, 231, 255, 239, 239, 255,
	247, 247, 255, 255, 255, 255,
]);

function readCString(
	bytes: Uint8Array,
	offset: number,
	maxLength: number,
): string {
	let len = 0;
	while (len < maxLength && bytes[offset + len] !== 0) {
		len++;
	}
	const slice = bytes.subarray(offset, offset + len);
	return new TextDecoder("ascii").decode(slice).trim();
}

/**
 * Parses a Quake II (.wal) texture and decodes the requested mipmap level to a 32-bit RGBA PNG.
 */
export function convertWalToPng(
	input: Uint8Array | ArrayBuffer,
	options: WalConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): WalConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 100) {
		throw new Error(
			"Invalid Quake II WAL file: File size is smaller than the 100-byte header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	const name = readCString(bytes, 0, 32);
	const width = view.getUint32(32, true);
	const height = view.getUint32(36, true);

	const mipmapOffsets = [
		view.getUint32(40, true),
		view.getUint32(44, true),
		view.getUint32(48, true),
		view.getUint32(52, true),
	];

	const animName = readCString(bytes, 56, 32);
	const flags = view.getUint32(88, true);
	const contents = view.getUint32(92, true);
	const value = view.getUint32(96, true);

	// Validate dimensions
	if (width === 0 || height === 0 || width > 4096 || height > 4096) {
		throw new Error(
			`Invalid Quake II WAL dimensions: ${width}x${height} is out of bounds.`,
		);
	}

	// Validate offset 0
	const offset0 = mipmapOffsets[0] ?? 0;
	if (offset0 < 100 || offset0 >= bytes.length) {
		throw new Error(
			`Invalid Quake II WAL file: Mipmap offset 0 (${offset0}) is invalid.`,
		);
	}

	const selectedLevel = Math.max(0, Math.min(3, options.mipmapLevel ?? 0));
	const levelDivisor = 1 << selectedLevel;
	const mipWidth = Math.max(1, Math.floor(width / levelDivisor));
	const mipHeight = Math.max(1, Math.floor(height / levelDivisor));

	const targetOffset = mipmapOffsets[selectedLevel] ?? offset0;
	const expectedBytes = mipWidth * mipHeight;

	if (targetOffset + expectedBytes > bytes.length) {
		throw new Error(
			`Invalid Quake II WAL file: Truncated pixel data for mipmap level ${selectedLevel}.`,
		);
	}

	onProgress?.(0.4, "DECODE_PIXELS");

	const palette =
		options.palette && options.palette.length >= 768
			? options.palette
			: QUAKE2_PALETTE;

	const rgba = new Uint8Array(mipWidth * mipHeight * 4);
	const pixelSlice = bytes.subarray(targetOffset, targetOffset + expectedBytes);

	let rgbaIdx = 0;
	for (let i = 0; i < pixelSlice.length; i++) {
		const colorIndex = pixelSlice[i] ?? 0;
		const palOffset = colorIndex * 3;

		rgba[rgbaIdx++] = palette[palOffset] ?? 0; // R
		rgba[rgbaIdx++] = palette[palOffset + 1] ?? 0; // G
		rgba[rgbaIdx++] = palette[palOffset + 2] ?? 0; // B
		rgba[rgbaIdx++] = 255; // A (opaque)
	}

	onProgress?.(0.8, "ENCODE_PNG");

	const pngBytes = encodeRgbaToPng(mipWidth, mipHeight, rgba);

	const metadata: WalMetadata = {
		name,
		animName,
		width: mipWidth,
		height: mipHeight,
		flags,
		contents,
		value,
		mipmapOffsets,
		selectedMipmap: selectedLevel,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		pngBuffer: pngBytes.buffer as ArrayBuffer,
		metadata,
	};
}
