import { encodeRgbaToPng } from "../dds/parser";
import type {
	QoiConversionOptions,
	QoiConversionResult,
	QoiMetadata,
} from "./types";

/**
 * Decompresses a Quite OK Image (.qoi) byte stream into standard 32-bit RGBA PNG.
 */
export function convertQoiToPng(
	input: Uint8Array | ArrayBuffer,
	_options: QoiConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): QoiConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 22) {
		// 14-byte header + 8-byte end marker
		throw new Error(
			`Invalid QOI file: Size (${bytes.length} bytes) is too small to contain a valid QOI image.`,
		);
	}

	// Verify "qoif" magic bytes at offset 0
	if (
		bytes[0] !== 0x71 || // 'q'
		bytes[1] !== 0x6f || // 'o'
		bytes[2] !== 0x69 || // 'i'
		bytes[3] !== 0x66 // 'f'
	) {
		throw new Error(
			"Invalid QOI file: Missing 'qoif' magic signature at offset 0.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const width = view.getUint32(4, false); // Big-Endian
	const height = view.getUint32(8, false); // Big-Endian
	const channels = bytes[12] ?? 4;
	const colorspace = bytes[13] ?? 0;

	if (width === 0 || height === 0) {
		throw new Error(
			`Invalid QOI dimensions: ${width}x${height} cannot be zero.`,
		);
	}

	if (channels !== 3 && channels !== 4) {
		throw new Error(
			`Invalid QOI channels: ${channels} must be 3 (RGB) or 4 (RGBA).`,
		);
	}

	const totalPixels = width * height;
	if (totalPixels > 67108864) {
		// 64 megapixels safety limit
		throw new Error(
			`QOI image dimensions (${width}x${height}) exceed maximum allowed dimension limit.`,
		);
	}

	onProgress?.(0.2, "DECODE_SCANLINES");
	const rgba = new Uint8Array(totalPixels * 4);

	// Running color index array (64 entries of 4 bytes)
	const index = new Uint8Array(64 * 4);

	let r = 0;
	let g = 0;
	let b = 0;
	let a = 255;

	let pixelPos = 0;
	const pixelEnd = totalPixels * 4;
	let p = 14;
	const endLimit = bytes.length - 8; // Exclude 8-byte end marker

	function saveIndex() {
		const hash = ((r * 3 + g * 5 + b * 7 + a * 11) & 63) * 4;
		index[hash] = r;
		index[hash + 1] = g;
		index[hash + 2] = b;
		index[hash + 3] = a;
	}

	while (pixelPos < pixelEnd && p < endLimit) {
		const b1 = bytes[p++] ?? 0;

		if (b1 === 0xfe) {
			// QOI_OP_RGB
			r = bytes[p++] ?? 0;
			g = bytes[p++] ?? 0;
			b = bytes[p++] ?? 0;
			saveIndex();
			rgba[pixelPos++] = r;
			rgba[pixelPos++] = g;
			rgba[pixelPos++] = b;
			rgba[pixelPos++] = a;
		} else if (b1 === 0xff) {
			// QOI_OP_RGBA
			r = bytes[p++] ?? 0;
			g = bytes[p++] ?? 0;
			b = bytes[p++] ?? 0;
			a = bytes[p++] ?? 255;
			saveIndex();
			rgba[pixelPos++] = r;
			rgba[pixelPos++] = g;
			rgba[pixelPos++] = b;
			rgba[pixelPos++] = a;
		} else {
			const tag = b1 & 0xc0;

			if (tag === 0x00) {
				// QOI_OP_INDEX
				const idx = (b1 & 0x3f) * 4;
				r = index[idx] ?? 0;
				g = index[idx + 1] ?? 0;
				b = index[idx + 2] ?? 0;
				a = index[idx + 3] ?? 255;
				rgba[pixelPos++] = r;
				rgba[pixelPos++] = g;
				rgba[pixelPos++] = b;
				rgba[pixelPos++] = a;
			} else if (tag === 0x40) {
				// QOI_OP_DIFF
				const dr = ((b1 >> 4) & 0x03) - 2;
				const dg = ((b1 >> 2) & 0x03) - 2;
				const db = (b1 & 0x03) - 2;
				r = (r + dr) & 0xff;
				g = (g + dg) & 0xff;
				b = (b + db) & 0xff;
				saveIndex();
				rgba[pixelPos++] = r;
				rgba[pixelPos++] = g;
				rgba[pixelPos++] = b;
				rgba[pixelPos++] = a;
			} else if (tag === 0x80) {
				// QOI_OP_LUMA
				const b2 = bytes[p++] ?? 0;
				const dg = (b1 & 0x3f) - 32;
				const dr_dg = ((b2 >> 4) & 0x0f) - 8;
				const db_dg = (b2 & 0x0f) - 8;
				r = (r + dg + dr_dg) & 0xff;
				g = (g + dg) & 0xff;
				b = (b + dg + db_dg) & 0xff;
				saveIndex();
				rgba[pixelPos++] = r;
				rgba[pixelPos++] = g;
				rgba[pixelPos++] = b;
				rgba[pixelPos++] = a;
			} else if (tag === 0xc0) {
				// QOI_OP_RUN
				const run = (b1 & 0x3f) + 1;
				for (let i = 0; i < run && pixelPos < pixelEnd; i++) {
					rgba[pixelPos++] = r;
					rgba[pixelPos++] = g;
					rgba[pixelPos++] = b;
					rgba[pixelPos++] = a;
				}
			}
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(width, height, rgba);

	onProgress?.(1.0, "COMPLETE");
	const metadata: QoiMetadata = {
		width,
		height,
		channels,
		colorspace,
		fileSize: bytes.length,
	};

	return {
		pngBytes,
		metadata,
	};
}
