import { encodeRgbaToPng } from "../dds/parser";
import { decompressByteRun1 } from "../iff/parser";
import type {
	AcbmConversionOptions,
	AcbmConversionResult,
	AcbmMetadata,
} from "./types";

interface RgbColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Parses Commodore Amiga Continuous Bitmap (ACBM) IFF container files
 * and renders them into standard 32-bit RGBA PNG images.
 */
export function convertAcbmToPng(
	input: ArrayBuffer | Uint8Array,
	options: AcbmConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): AcbmConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 12) {
		throw new Error(
			"Invalid ACBM file: File size is smaller than the 12-byte IFF header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// 1. Verify IFF FORM container
	const formTag = String.fromCharCode(
		bytes[0] ?? 0,
		bytes[1] ?? 0,
		bytes[2] ?? 0,
		bytes[3] ?? 0,
	);
	if (formTag !== "FORM") {
		throw new Error(
			`Invalid ACBM file: Missing IFF 'FORM' signature, found '${formTag}'.`,
		);
	}

	const subType = String.fromCharCode(
		bytes[8] ?? 0,
		bytes[9] ?? 0,
		bytes[10] ?? 0,
		bytes[11] ?? 0,
	);
	if (subType !== "ACBM") {
		throw new Error(
			`Invalid ACBM format subtype: Expected 'ACBM', found '${subType}'.`,
		);
	}

	onProgress?.(0.15, "PARSE_CHUNKS");

	let width = 0;
	let height = 0;
	let nPlanes = 0;
	let masking = 0;
	let compression = 0;
	let transparentColor = -1;
	let hasBmhd = false;

	const palette: RgbColor[] = [];
	let bitmapData: Uint8Array | null = null;

	let offset = 12;
	while (offset + 8 <= bytes.length) {
		const chunkId = String.fromCharCode(
			bytes[offset] ?? 0,
			bytes[offset + 1] ?? 0,
			bytes[offset + 2] ?? 0,
			bytes[offset + 3] ?? 0,
		);
		const chunkSize = view.getUint32(offset + 4, false); // Big-Endian
		const dataOffset = offset + 8;
		const nextOffset = dataOffset + chunkSize + (chunkSize % 2 !== 0 ? 1 : 0);

		if (dataOffset + chunkSize > bytes.length) {
			break;
		}

		if (chunkId === "BMHD" && chunkSize >= 20) {
			hasBmhd = true;
			width = view.getUint16(dataOffset, false);
			height = view.getUint16(dataOffset + 2, false);
			nPlanes = bytes[dataOffset + 8] ?? 0;
			masking = bytes[dataOffset + 9] ?? 0;
			compression = bytes[dataOffset + 10] ?? 0;
			if (masking === 2) {
				transparentColor = view.getUint16(dataOffset + 12, false);
			}
		} else if (chunkId === "CMAP") {
			const colorCount = Math.floor(chunkSize / 3);
			for (let i = 0; i < colorCount; i++) {
				const cOffset = dataOffset + i * 3;
				const r = bytes[cOffset] ?? 0;
				const g = bytes[cOffset + 1] ?? 0;
				const b = bytes[cOffset + 2] ?? 0;
				palette.push({ r, g, b, a: 255 });
			}
		} else if (chunkId === "ABMP" || chunkId === "BODY") {
			// Continuous planar bitmap chunk
			bitmapData = bytes.subarray(dataOffset, dataOffset + chunkSize);
		}

		offset = nextOffset;
	}

	if (!hasBmhd || width <= 0 || height <= 0 || nPlanes <= 0) {
		throw new Error(
			"Invalid ACBM file: Missing or invalid BMHD (BitMap Header) chunk.",
		);
	}

	if (!bitmapData) {
		throw new Error(
			"Invalid ACBM file: Missing ABMP/BODY continuous bitmap data chunk.",
		);
	}

	onProgress?.(0.35, "DECOMPRESS_PLANES");

	// Row width in Amiga is rounded up to 16-bit word boundary (2 bytes)
	const bytesPerRow = Math.floor((width + 15) / 16) * 2;
	const planeSize = bytesPerRow * height;
	const maskPlanes = masking === 1 ? 1 : 0;
	const totalPlanes = nPlanes + maskPlanes;
	const expectedSize = planeSize * totalPlanes;

	let decompressedData: Uint8Array;
	if (compression === 1) {
		// ByteRun1 RLE decompression
		decompressedData = decompressByteRun1(bitmapData, expectedSize);
	} else {
		decompressedData = new Uint8Array(expectedSize);
		decompressedData.set(
			bitmapData.subarray(0, Math.min(bitmapData.length, expectedSize)),
		);
	}

	onProgress?.(0.6, "RENDER_PIXELS");

	// If palette is missing or partial, generate fallback
	const numColorsNeeded = 1 << Math.min(8, nPlanes);
	if (palette.length === 0) {
		if (nPlanes === 1) {
			palette.push({ r: 0, g: 0, b: 0, a: 255 });
			palette.push({ r: 255, g: 255, b: 255, a: 255 });
		} else {
			for (let i = 0; i < numColorsNeeded; i++) {
				const val = Math.floor((i * 255) / (numColorsNeeded - 1));
				palette.push({ r: val, g: val, b: val, a: 255 });
			}
		}
	} else if (palette.length < numColorsNeeded) {
		for (let i = palette.length; i < numColorsNeeded; i++) {
			palette.push({ r: 0, g: 0, b: 0, a: 255 });
		}
	}

	const rgba = new Uint8Array(width * height * 4);
	const preserveAlpha = options.preserveAlpha ?? true;

	for (let y = 0; y < height; y++) {
		const rowOffset = y * bytesPerRow;

		for (let x = 0; x < width; x++) {
			const byteIndex = rowOffset + (x >> 3);
			const bitIndex = 7 - (x & 7);
			const bitMask = 1 << bitIndex;
			const pixelIdx = (y * width + x) * 4;

			if (nPlanes <= 8) {
				let colorIndex = 0;
				for (let p = 0; p < nPlanes; p++) {
					const pOffset = p * planeSize + byteIndex;
					const byteVal = decompressedData[pOffset] ?? 0;
					if ((byteVal & bitMask) !== 0) {
						colorIndex |= 1 << p;
					}
				}

				const color = palette[colorIndex] ?? { r: 0, g: 0, b: 0, a: 255 };
				let alpha = 255;

				if (preserveAlpha) {
					if (masking === 1) {
						const maskOffset = nPlanes * planeSize + byteIndex;
						const maskByte = decompressedData[maskOffset] ?? 0;
						alpha = (maskByte & bitMask) !== 0 ? 255 : 0;
					} else if (masking === 2 && colorIndex === transparentColor) {
						alpha = 0;
					}
				}

				rgba[pixelIdx] = color.r;
				rgba[pixelIdx + 1] = color.g;
				rgba[pixelIdx + 2] = color.b;
				rgba[pixelIdx + 3] = alpha;
			} else if (nPlanes === 24) {
				// 24-bit RGB continuous bitmap: 8 planes R, 8 planes G, 8 planes B
				let r = 0;
				let g = 0;
				let b = 0;

				for (let p = 0; p < 8; p++) {
					const pOffset = p * planeSize + byteIndex;
					if (((decompressedData[pOffset] ?? 0) & bitMask) !== 0) {
						r |= 1 << p;
					}
				}
				for (let p = 0; p < 8; p++) {
					const pOffset = (8 + p) * planeSize + byteIndex;
					if (((decompressedData[pOffset] ?? 0) & bitMask) !== 0) {
						g |= 1 << p;
					}
				}
				for (let p = 0; p < 8; p++) {
					const pOffset = (16 + p) * planeSize + byteIndex;
					if (((decompressedData[pOffset] ?? 0) & bitMask) !== 0) {
						b |= 1 << p;
					}
				}

				let alpha = 255;
				if (preserveAlpha && masking === 1) {
					const maskOffset = 24 * planeSize + byteIndex;
					alpha =
						((decompressedData[maskOffset] ?? 0) & bitMask) !== 0 ? 255 : 0;
				}

				rgba[pixelIdx] = r;
				rgba[pixelIdx + 1] = g;
				rgba[pixelIdx + 2] = b;
				rgba[pixelIdx + 3] = alpha;
			}
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(width, height, rgba);

	onProgress?.(1.0, "COMPLETE");

	const metadata: AcbmMetadata = {
		width,
		height,
		nPlanes,
		masking,
		compression,
		colorCount: palette.length,
	};

	return {
		metadata,
		pngBytes,
	};
}
