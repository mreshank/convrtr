import { encodeRgbaToPng } from "../dds/parser";
import {
	SGI_HEADER_SIZE,
	SGI_MAGIC,
	SGI_STORAGE_RLE,
	type SgiHeader,
} from "./types";

export function parseSgiHeader(view: DataView): SgiHeader {
	if (view.byteLength < SGI_HEADER_SIZE) {
		throw new Error(
			`Invalid SGI file: header must be at least ${SGI_HEADER_SIZE} bytes (got ${view.byteLength})`,
		);
	}

	const magic = view.getUint16(0, false);
	if (magic !== SGI_MAGIC) {
		throw new Error(
			`Invalid SGI magic: 0x${magic.toString(16).toUpperCase()} (expected 0x01DA)`,
		);
	}

	const storage = view.getUint8(2);
	const bpc = view.getUint8(3);
	const dimension = view.getUint16(4, false);
	const width = view.getUint16(6, false);
	const height = view.getUint16(8, false);
	const channels = view.getUint16(10, false);
	const pixmin = view.getUint32(12, false);
	const pixmax = view.getUint32(16, false);

	// Read null-terminated name at offset 24 (80 bytes)
	const nameBytes: number[] = [];
	for (let i = 0; i < 80; i++) {
		const ch = view.getUint8(24 + i);
		if (ch === 0) break;
		nameBytes.push(ch);
	}
	const name = String.fromCharCode(...nameBytes);
	const colormap = view.getUint32(104, false);

	if (width <= 0 || height <= 0) {
		throw new Error(`Invalid SGI dimensions: ${width}x${height}`);
	}

	if (channels <= 0 || channels > 16) {
		throw new Error(`Unsupported SGI channel count: ${channels}`);
	}

	if (bpc !== 1 && bpc !== 2) {
		throw new Error(`Unsupported SGI bytes per channel: ${bpc}`);
	}

	return {
		magic,
		storage,
		bpc,
		dimension,
		width,
		height,
		channels,
		pixmin,
		pixmax,
		name,
		colormap,
	};
}

/**
 * Decompresses an SGI RLE scanline.
 */
function decompressSgiRleScanline(
	view: DataView,
	u8: Uint8Array,
	offset: number,
	length: number,
	outWidth: number,
	bpc: number,
): Uint8Array {
	const row = new Uint8Array(outWidth);
	let inIdx = offset;
	const endOffset = Math.min(u8.length, offset + length);
	let outIdx = 0;

	if (bpc === 1) {
		while (inIdx < endOffset && outIdx < outWidth) {
			const b = u8[inIdx++] ?? 0;
			const count = b & 0x7f;
			if (count === 0) break;

			if ((b & 0x80) === 0) {
				for (let i = 0; i < count && outIdx < outWidth; i++) {
					row[outIdx++] = u8[inIdx++] ?? 0;
				}
			} else {
				const val = u8[inIdx++] ?? 0;
				for (let i = 0; i < count && outIdx < outWidth; i++) {
					row[outIdx++] = val;
				}
			}
		}
	} else {
		// 16-bit: scale down to 8-bit
		while (inIdx + 1 < endOffset && outIdx < outWidth) {
			const b = view.getUint16(inIdx, false);
			inIdx += 2;
			const count = b & 0x7f;
			if (count === 0) break;

			if ((b & 0x80) === 0) {
				for (let i = 0; i < count && outIdx < outWidth; i++) {
					const val16 =
						inIdx + 1 < u8.length ? view.getUint16(inIdx, false) : 0;
					inIdx += 2;
					row[outIdx++] = (val16 >> 8) & 0xff;
				}
			} else {
				const val16 = inIdx + 1 < u8.length ? view.getUint16(inIdx, false) : 0;
				inIdx += 2;
				const val8 = (val16 >> 8) & 0xff;
				for (let i = 0; i < count && outIdx < outWidth; i++) {
					row[outIdx++] = val8;
				}
			}
		}
	}

	return row;
}

/**
 * Reads an uncompressed (VERBATIM) SGI scanline.
 */
function readSgiVerbatimScanline(
	view: DataView,
	u8: Uint8Array,
	offset: number,
	outWidth: number,
	bpc: number,
): Uint8Array {
	const row = new Uint8Array(outWidth);
	if (bpc === 1) {
		for (let i = 0; i < outWidth; i++) {
			row[i] = u8[offset + i] ?? 0;
		}
	} else {
		for (let i = 0; i < outWidth; i++) {
			const val16 =
				offset + i * 2 + 1 < u8.length
					? view.getUint16(offset + i * 2, false)
					: 0;
			row[i] = (val16 >> 8) & 0xff;
		}
	}
	return row;
}

/**
 * Converts Silicon Graphics SGI (.rgb, .rgba, .sgi, .bw) image to standard 32-bit RGBA PNG.
 */
export function convertSgiToPng(
	buffer: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading SGI header");

	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);
	const header = parseSgiHeader(view);
	const { storage, bpc, width, height, channels } = header;

	onProgress?.(0.3, "Extracting planar scanlines");

	const numScanlines = height * channels;
	const isRle = storage === SGI_STORAGE_RLE;

	if (isRle && buffer.byteLength < SGI_HEADER_SIZE + numScanlines * 8) {
		throw new Error(
			"Truncated SGI file: RLE offset and length tables incomplete",
		);
	}

	const channelsData: Uint8Array[][] = [];
	for (let c = 0; c < channels; c++) {
		channelsData.push(new Array(height));
	}

	for (let c = 0; c < channels; c++) {
		const channelRows = channelsData[c];
		if (!channelRows) continue;

		for (let y = 0; y < height; y++) {
			const tableIdx = c * height + y;

			if (isRle) {
				const offsetPos = SGI_HEADER_SIZE + tableIdx * 4;
				const lengthPos = SGI_HEADER_SIZE + (numScanlines + tableIdx) * 4;
				const scanlineOffset = view.getUint32(offsetPos, false);
				const scanlineLen = view.getUint32(lengthPos, false);

				channelRows[y] = decompressSgiRleScanline(
					view,
					u8,
					scanlineOffset,
					scanlineLen,
					width,
					bpc,
				);
			} else {
				const scanlineOffset = SGI_HEADER_SIZE + (c * height + y) * width * bpc;
				channelRows[y] = readSgiVerbatimScanline(
					view,
					u8,
					scanlineOffset,
					width,
					bpc,
				);
			}
		}
	}

	onProgress?.(0.65, "Compositing 32-bit RGBA raster");

	const rgba = new Uint8Array(width * height * 4);

	// SGI rows are bottom-to-top (y = 0 is bottom). Standard PNG is top-to-bottom.
	for (let y = 0; y < height; y++) {
		const targetY = height - 1 - y;
		const lineOffset = targetY * width * 4;

		const rRow = channelsData[0]?.[y];
		const gRow = channelsData[1]?.[y];
		const bRow = channelsData[2]?.[y];
		const aRow = channelsData[3]?.[y];

		for (let x = 0; x < width; x++) {
			const pixelIdx = lineOffset + x * 4;

			if (channels === 1) {
				// Grayscale (B/W)
				const lum = rRow?.[x] ?? 0;
				rgba[pixelIdx] = lum;
				rgba[pixelIdx + 1] = lum;
				rgba[pixelIdx + 2] = lum;
				rgba[pixelIdx + 3] = 255;
			} else if (channels === 2) {
				// Grayscale + Alpha
				const lum = rRow?.[x] ?? 0;
				const alpha = gRow?.[x] ?? 255;
				rgba[pixelIdx] = lum;
				rgba[pixelIdx + 1] = lum;
				rgba[pixelIdx + 2] = lum;
				rgba[pixelIdx + 3] = alpha;
			} else if (channels === 3) {
				// RGB Truecolor
				rgba[pixelIdx] = rRow?.[x] ?? 0;
				rgba[pixelIdx + 1] = gRow?.[x] ?? 0;
				rgba[pixelIdx + 2] = bRow?.[x] ?? 0;
				rgba[pixelIdx + 3] = 255;
			} else {
				// RGBA Truecolor + Alpha
				rgba[pixelIdx] = rRow?.[x] ?? 0;
				rgba[pixelIdx + 1] = gRow?.[x] ?? 0;
				rgba[pixelIdx + 2] = bRow?.[x] ?? 0;
				rgba[pixelIdx + 3] = aRow?.[x] ?? 255;
			}
		}
	}

	onProgress?.(0.85, "Encoding lossless PNG");
	const pngBytes = encodeRgbaToPng(width, height, rgba);

	onProgress?.(1.0, "Complete");
	return pngBytes.buffer.slice(
		pngBytes.byteOffset,
		pngBytes.byteOffset + pngBytes.byteLength,
	) as ArrayBuffer;
}
