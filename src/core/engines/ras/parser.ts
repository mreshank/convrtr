import { encodeRgbaToPng } from "../dds/parser";
import {
	RAS_MAGIC,
	RAS_MAPTYPE_EQUAL_RGB,
	RAS_TYPE_BYTE_ENCODED,
	RAS_TYPE_FORMAT_RGB,
	type RasHeader,
	type RasMetadata,
} from "./types";

export interface RasParseResult {
	metadata: RasMetadata;
	pngBytes: Uint8Array;
}

export function parseRasHeader(view: DataView): RasHeader {
	if (view.byteLength < 32) {
		throw new Error(
			"Invalid Sun Raster file: header must be at least 32 bytes",
		);
	}

	const magic = view.getUint32(0, false);
	if (magic !== RAS_MAGIC) {
		throw new Error(
			`Invalid Sun Raster magic number: 0x${magic.toString(16).toUpperCase()} (expected 0x59A66A95)`,
		);
	}

	const width = view.getUint32(4, false);
	const height = view.getUint32(8, false);
	const depth = view.getUint32(12, false);
	const length = view.getUint32(16, false);
	const type = view.getUint32(20, false);
	const maptype = view.getUint32(24, false);
	const maplength = view.getUint32(28, false);

	if (width <= 0 || height <= 0) {
		throw new Error(`Invalid Sun Raster dimensions: ${width}x${height}`);
	}

	if (depth !== 1 && depth !== 8 && depth !== 24 && depth !== 32) {
		throw new Error(`Unsupported Sun Raster bit depth: ${depth}-bit`);
	}

	return {
		magic,
		width,
		height,
		depth,
		length,
		type,
		maptype,
		maplength,
	};
}

/**
 * Calculates row byte width with 16-bit (2-byte) scanline padding.
 */
export function getRasRowBytes(width: number, depth: number): number {
	if (depth === 1) {
		return Math.floor((width + 15) / 16) * 2;
	}
	if (depth === 8) {
		return width + (width % 2);
	}
	if (depth === 24) {
		const rawBytes = width * 3;
		return rawBytes + (rawBytes % 2);
	}
	if (depth === 32) {
		return width * 4;
	}
	const rawBits = width * depth;
	const rawBytes = Math.ceil(rawBits / 8);
	return rawBytes + (rawBytes % 2);
}

/**
 * Decompresses RLE-encoded Sun Raster stream.
 */
function decompressRasRle(
	compressed: Uint8Array,
	expectedLength: number,
): Uint8Array {
	const output = new Uint8Array(expectedLength);
	let srcIdx = 0;
	let dstIdx = 0;

	while (srcIdx < compressed.length && dstIdx < expectedLength) {
		const byte = compressed[srcIdx++];
		if (byte === undefined) break;
		if (byte !== 0x80) {
			output[dstIdx++] = byte;
		} else {
			if (srcIdx >= compressed.length) break;
			const count = compressed[srcIdx++];
			if (count === undefined) break;
			if (count === 0) {
				output[dstIdx++] = 0x80;
			} else {
				if (srcIdx >= compressed.length) break;
				const val = compressed[srcIdx++];
				if (val === undefined) break;
				const repeat = count + 1;
				for (let r = 0; r < repeat && dstIdx < expectedLength; r++) {
					output[dstIdx++] = val;
				}
			}
		}
	}

	return output;
}

/**
 * Converts Sun Raster (.ras, .sun) binary data to standard 32-bit RGBA PNG.
 */
export function convertRasToPng(
	buffer: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Sun Raster header");

	const view = new DataView(buffer);
	const header = parseRasHeader(view);
	const { width, height, depth, type, maptype, maplength } = header;

	const mapStart = 32;
	const mapEnd = mapStart + maplength;
	if (buffer.byteLength < mapEnd) {
		throw new Error("Truncated Sun Raster file: colormap data incomplete");
	}

	onProgress?.(0.25, "Decoding colormap and raster payload");

	// Parse colormap if present (RMT_EQUAL_RGB format has equal Red, Green, Blue planes)
	let palette: [number, number, number][] | null = null;
	if (maptype === RAS_MAPTYPE_EQUAL_RGB && maplength >= 3) {
		const numEntries = Math.floor(maplength / 3);
		const colormapBytes = new Uint8Array(buffer, mapStart, maplength);
		palette = new Array(numEntries);
		for (let i = 0; i < numEntries; i++) {
			const r = colormapBytes[i] ?? 0;
			const g = colormapBytes[i + numEntries] ?? 0;
			const b = colormapBytes[i + 2 * numEntries] ?? 0;
			palette[i] = [r, g, b];
		}
	}

	const rowBytes = getRasRowBytes(width, depth);
	const totalExpectedRasterBytes = rowBytes * height;

	const rawDataStart = mapEnd;
	let rasterData: Uint8Array;

	if (type === RAS_TYPE_BYTE_ENCODED) {
		onProgress?.(0.4, "Decompressing RLE raster stream");
		const compressedSlice = new Uint8Array(buffer, rawDataStart);
		rasterData = decompressRasRle(compressedSlice, totalExpectedRasterBytes);
	} else {
		rasterData = new Uint8Array(
			buffer,
			rawDataStart,
			Math.min(buffer.byteLength - rawDataStart, totalExpectedRasterBytes),
		);
	}

	onProgress?.(0.6, "Rasterizing pixels to 32-bit RGBA");

	const rgba = new Uint8Array(width * height * 4);
	const isFormatRgb = type === RAS_TYPE_FORMAT_RGB;

	for (let y = 0; y < height; y++) {
		const lineOffset = y * rowBytes;

		for (let x = 0; x < width; x++) {
			const pixelIdx = (y * width + x) * 4;

			if (depth === 1) {
				const byteIdx = lineOffset + Math.floor(x / 8);
				const bitIdx = 7 - (x % 8);
				const byteVal =
					byteIdx < rasterData.length ? (rasterData[byteIdx] ?? 0) : 0;
				const bitVal = (byteVal >> bitIdx) & 1;

				if (palette && palette.length >= 2) {
					const color = palette[bitVal] ?? [0, 0, 0];
					rgba[pixelIdx] = color[0] ?? 0;
					rgba[pixelIdx + 1] = color[1] ?? 0;
					rgba[pixelIdx + 2] = color[2] ?? 0;
				} else {
					// Classic Sun monochrome: 0 = white, 1 = black
					const lum = bitVal === 0 ? 255 : 0;
					rgba[pixelIdx] = lum;
					rgba[pixelIdx + 1] = lum;
					rgba[pixelIdx + 2] = lum;
				}
				rgba[pixelIdx + 3] = 255;
			} else if (depth === 8) {
				const dataOffset = lineOffset + x;
				const colorIndex =
					dataOffset < rasterData.length ? (rasterData[dataOffset] ?? 0) : 0;

				if (palette && colorIndex < palette.length) {
					const color = palette[colorIndex] ?? [0, 0, 0];
					rgba[pixelIdx] = color[0] ?? 0;
					rgba[pixelIdx + 1] = color[1] ?? 0;
					rgba[pixelIdx + 2] = color[2] ?? 0;
				} else {
					// Greyscale fallback
					rgba[pixelIdx] = colorIndex;
					rgba[pixelIdx + 1] = colorIndex;
					rgba[pixelIdx + 2] = colorIndex;
				}
				rgba[pixelIdx + 3] = 255;
			} else if (depth === 24) {
				const dataOffset = lineOffset + x * 3;
				if (dataOffset + 2 < rasterData.length) {
					const b0 = rasterData[dataOffset] ?? 0;
					const b1 = rasterData[dataOffset + 1] ?? 0;
					const b2 = rasterData[dataOffset + 2] ?? 0;
					if (isFormatRgb) {
						rgba[pixelIdx] = b0;
						rgba[pixelIdx + 1] = b1;
						rgba[pixelIdx + 2] = b2;
					} else {
						// Standard Sun Raster 24-bit is BGR
						rgba[pixelIdx] = b2; // R
						rgba[pixelIdx + 1] = b1; // G
						rgba[pixelIdx + 2] = b0; // B
					}
				}
				rgba[pixelIdx + 3] = 255;
			} else if (depth === 32) {
				const dataOffset = lineOffset + x * 4;
				if (dataOffset + 3 < rasterData.length) {
					const b1 = rasterData[dataOffset + 1] ?? 0;
					const b2 = rasterData[dataOffset + 2] ?? 0;
					const b3 = rasterData[dataOffset + 3] ?? 0;
					if (isFormatRgb) {
						// Format: [pad, R, G, B]
						rgba[pixelIdx] = b1;
						rgba[pixelIdx + 1] = b2;
						rgba[pixelIdx + 2] = b3;
					} else {
						// Standard Sun Raster 32-bit: [pad, B, G, R]
						rgba[pixelIdx] = b3; // R
						rgba[pixelIdx + 1] = b2; // G
						rgba[pixelIdx + 2] = b1; // B
					}
				}
				rgba[pixelIdx + 3] = 255;
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
