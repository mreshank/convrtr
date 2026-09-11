import { encodeRgbaToPng } from "../dds/parser";
import type {
	MacPaintConversionResult,
	MacPaintMetadata,
	MacPaintOptions,
} from "./types";

const MACPAINT_WIDTH = 576;
const MACPAINT_HEIGHT = 576;
const BYTES_PER_ROW = 72; // 576 / 8
const TOTAL_UNCOMPRESSED_BYTES = BYTES_PER_ROW * MACPAINT_HEIGHT; // 41,472

/**
 * Parses and decodes an Apple Macintosh MacPaint (.mac / .pntg) image
 * into a lossless 32-bit RGBA PNG.
 */
export function convertMacPaintToPng(
	input: Uint8Array | ArrayBuffer,
	options: MacPaintOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): MacPaintConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 512) {
		throw new Error(
			"Invalid MacPaint file: File size is smaller than the minimum 512-byte header.",
		);
	}

	// Detect header offset: Standard MacPaint has 512-byte header.
	// MacBinary wrapped MacPaint has 128-byte MacBinary + 512-byte MacPaint header (640 bytes total).
	let dataOffset = 512;
	let version = 0;

	// Check if this might be a MacBinary container
	if (
		bytes.length > 640 &&
		bytes[0] === 0x00 &&
		bytes[74] === 0x00 &&
		bytes[1] &&
		bytes[1] > 0 &&
		bytes[1] <= 63
	) {
		// MacBinary header detected
		dataOffset = 640;
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		version = view.getUint32(128, false);
	} else {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		version = view.getUint32(0, false);
	}

	onProgress?.(0.3, "DECOMPRESS_PACKBITS");

	// Unpack 576 scanlines of 72 bytes each
	const uncompressed = new Uint8Array(TOTAL_UNCOMPRESSED_BYTES);
	let uncompIndex = 0;
	let offset = dataOffset;
	const fileLen = bytes.length;

	for (let line = 0; line < MACPAINT_HEIGHT && offset < fileLen; line++) {
		const lineEnd = uncompIndex + BYTES_PER_ROW;

		while (uncompIndex < lineEnd && offset < fileLen) {
			const b = bytes[offset++] ?? 0;

			if (b <= 127) {
				// Literal run: copy b + 1 bytes
				const count = b + 1;
				for (
					let i = 0;
					i < count && uncompIndex < lineEnd && offset < fileLen;
					i++
				) {
					uncompressed[uncompIndex++] = bytes[offset++] ?? 0;
				}
			} else if (b > 128) {
				// Repeat run: repeat next byte (256 - b + 1) times
				const count = 256 - b + 1;
				const repeatVal = bytes[offset++] ?? 0;
				for (let i = 0; i < count && uncompIndex < lineEnd; i++) {
					uncompressed[uncompIndex++] = repeatVal;
				}
			}
			// b === 128 is a NOP in Apple PackBits
		}

		// If row wasn't fully filled (e.g. truncated file), pad remainder with 0 (white)
		while (uncompIndex < lineEnd) {
			uncompressed[uncompIndex++] = 0;
		}

		if (line % 64 === 0) {
			onProgress?.(
				0.3 + (line / MACPAINT_HEIGHT) * 0.4,
				"DECOMPRESSING_SCANLINES",
			);
		}
	}

	onProgress?.(0.7, "BUILD_RGBA");

	const transparent = Boolean(options.transparentBackground);
	const invert = Boolean(options.invertColors);

	const rgba = new Uint8Array(MACPAINT_WIDTH * MACPAINT_HEIGHT * 4);
	let pixelOffset = 0;

	// In MacPaint: 1 bit per pixel. Bit 1 = Black, Bit 0 = White.
	for (let i = 0; i < TOTAL_UNCOMPRESSED_BYTES; i++) {
		const byteVal = uncompressed[i] ?? 0;

		for (let bit = 7; bit >= 0; bit--) {
			const isBlackRaw = ((byteVal >> bit) & 0x01) === 1;
			const isBlack = invert ? !isBlackRaw : isBlackRaw;

			const p = pixelOffset * 4;
			if (isBlack) {
				rgba[p] = 0;
				rgba[p + 1] = 0;
				rgba[p + 2] = 0;
				rgba[p + 3] = 255; // Opaque Black
			} else {
				rgba[p] = 255;
				rgba[p + 1] = 255;
				rgba[p + 2] = 255;
				rgba[p + 3] = transparent ? 0 : 255; // White or Transparent
			}
			pixelOffset++;
		}
	}

	onProgress?.(0.9, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(MACPAINT_WIDTH, MACPAINT_HEIGHT, rgba);

	const metadata: MacPaintMetadata = {
		width: MACPAINT_WIDTH,
		height: MACPAINT_HEIGHT,
		version,
		patternCount: 38,
		uncompressedBytes: TOTAL_UNCOMPRESSED_BYTES,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		pngBytes,
	};
}
