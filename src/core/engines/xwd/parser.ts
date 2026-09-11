import { encodeRgbaToPng } from "../dds/parser";
import type { XwdHeader } from "./types";

function getMaskShift(mask: number): { shift: number; maxVal: number } {
	if (mask === 0) return { shift: 0, maxVal: 255 };
	let shift = 0;
	let m = mask;
	while ((m & 1) === 0 && shift < 32) {
		m >>>= 1;
		shift++;
	}
	return { shift, maxVal: m > 0 ? m : 255 };
}

/**
 * Parses the 100+ byte XWD (X Window Dump) header.
 */
export function parseXwdHeader(u8: Uint8Array): XwdHeader {
	if (u8.length < 100) {
		throw new Error(
			`Invalid XWD file: File size too small (${u8.length} bytes, minimum 100)`,
		);
	}

	const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
	const headerSize = view.getUint32(0, false);
	const fileVersion = view.getUint32(4, false);

	if (fileVersion !== 7) {
		throw new Error(
			`Unsupported XWD version: expected version 7, got ${fileVersion}`,
		);
	}

	if (headerSize < 100 || headerSize > u8.length) {
		throw new Error(
			`Invalid XWD header size: ${headerSize} bytes (file length: ${u8.length})`,
		);
	}

	const pixmapFormat = view.getUint32(8, false);
	const pixmapDepth = view.getUint32(12, false);
	const pixmapWidth = view.getUint32(16, false);
	const pixmapHeight = view.getUint32(20, false);
	const xOffset = view.getUint32(24, false);
	const byteOrder = view.getUint32(28, false);
	const bitmapUnit = view.getUint32(32, false);
	const bitmapBitOrder = view.getUint32(36, false);
	const bitmapPad = view.getUint32(40, false);
	const bitsPerPixel = view.getUint32(44, false);
	const bytesPerLine = view.getUint32(48, false);
	const visualClass = view.getUint32(52, false);
	const redMask = view.getUint32(56, false);
	const greenMask = view.getUint32(60, false);
	const blueMask = view.getUint32(64, false);
	const bitsPerRgb = view.getUint32(68, false);
	const colormapEntries = view.getUint32(72, false);
	const ncolors = view.getUint32(76, false);
	const windowWidth = view.getUint32(80, false);
	const windowHeight = view.getUint32(84, false);
	const windowX = view.getInt32(88, false);
	const windowY = view.getInt32(92, false);
	const windowBorderWidth = view.getUint32(96, false);

	if (pixmapWidth === 0 || pixmapHeight === 0) {
		throw new Error(
			`Invalid XWD image dimensions: ${pixmapWidth}x${pixmapHeight}`,
		);
	}

	// Extract null-terminated window name string
	let windowName = "";
	const nameLength = Math.max(0, headerSize - 100);
	if (nameLength > 0) {
		const nameBytes = u8.slice(100, 100 + nameLength);
		const nullIndex = nameBytes.indexOf(0);
		const sliceLen = nullIndex !== -1 ? nullIndex : nameBytes.length;
		windowName = new TextDecoder("latin1").decode(nameBytes.slice(0, sliceLen));
	}

	return {
		headerSize,
		fileVersion,
		pixmapFormat,
		pixmapDepth,
		pixmapWidth,
		pixmapHeight,
		xOffset,
		byteOrder,
		bitmapUnit,
		bitmapBitOrder,
		bitmapPad,
		bitsPerPixel,
		bytesPerLine,
		visualClass,
		redMask,
		greenMask,
		blueMask,
		bitsPerRgb,
		colormapEntries,
		ncolors,
		windowWidth,
		windowHeight,
		windowX,
		windowY,
		windowBorderWidth,
		windowName,
	};
}

/**
 * Converts XWD binary data into a standard lossless 32-bit RGBA PNG.
 */
export async function convertXwdToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<Uint8Array> {
	onProgress?.(0.1, "Reading XWD header");
	const u8 = new Uint8Array(input);
	const header = parseXwdHeader(u8);
	const {
		headerSize,
		ncolors,
		pixmapWidth: width,
		pixmapHeight: height,
		bitsPerPixel,
		bytesPerLine,
		byteOrder,
		bitmapBitOrder,
		redMask: initialRedMask,
		greenMask: initialGreenMask,
		blueMask: initialBlueMask,
	} = header;

	const view = new DataView(input);
	const colormapOffset = headerSize;
	const colorMapSize = ncolors * 12;
	const pixelDataOffset = colormapOffset + colorMapSize;

	if (u8.length < pixelDataOffset) {
		throw new Error(
			`Invalid XWD file: Truncated before pixel data (file size: ${u8.length}, expected at least ${pixelDataOffset})`,
		);
	}

	onProgress?.(0.3, "Reading color map");
	const palette: [number, number, number][] = new Array(256)
		.fill(null)
		.map((_, i) => [i, i, i]);

	for (let i = 0; i < ncolors; i++) {
		const entryOffset = colormapOffset + i * 12;
		if (entryOffset + 12 <= u8.length) {
			const pixel = view.getUint32(entryOffset, false);
			const r = view.getUint16(entryOffset + 4, false) >> 8;
			const g = view.getUint16(entryOffset + 6, false) >> 8;
			const b = view.getUint16(entryOffset + 8, false) >> 8;
			if (pixel < 256) {
				palette[pixel] = [r, g, b];
			} else if (i < 256) {
				palette[i] = [r, g, b];
			}
		}
	}

	onProgress?.(0.5, "Decoding scanlines");
	const rgba = new Uint8Array(width * height * 4);

	// Determine masks and shifts for truecolor/directcolor modes
	let rMask = initialRedMask;
	let gMask = initialGreenMask;
	let bMask = initialBlueMask;

	if (bitsPerPixel === 32 || bitsPerPixel === 24) {
		if (rMask === 0 && gMask === 0 && bMask === 0) {
			// Default 888 truecolor
			rMask = 0x00ff0000;
			gMask = 0x0000ff00;
			bMask = 0x000000ff;
		}
	} else if (bitsPerPixel === 16) {
		if (rMask === 0 && gMask === 0 && bMask === 0) {
			// Default 565 truecolor
			rMask = 0xf800;
			gMask = 0x07e0;
			bMask = 0x001f;
		}
	}

	const rInfo = getMaskShift(rMask);
	const gInfo = getMaskShift(gMask);
	const bInfo = getMaskShift(bMask);

	const stride =
		bytesPerLine > 0 ? bytesPerLine : Math.ceil((width * bitsPerPixel) / 8);

	for (let y = 0; y < height; y++) {
		const rowOffset = pixelDataOffset + y * stride;
		if (rowOffset >= u8.length) break;

		for (let x = 0; x < width; x++) {
			const outIdx = (y * width + x) * 4;

			if (bitsPerPixel === 32) {
				const pixOffset = rowOffset + x * 4;
				if (pixOffset + 4 <= u8.length) {
					const pixelVal =
						byteOrder === 1
							? view.getUint32(pixOffset, false)
							: view.getUint32(pixOffset, true);
					const r = Math.round(
						(((pixelVal & rMask) >>> rInfo.shift) / rInfo.maxVal) * 255,
					);
					const g = Math.round(
						(((pixelVal & gMask) >>> gInfo.shift) / gInfo.maxVal) * 255,
					);
					const b = Math.round(
						(((pixelVal & bMask) >>> bInfo.shift) / bInfo.maxVal) * 255,
					);
					rgba[outIdx] = r;
					rgba[outIdx + 1] = g;
					rgba[outIdx + 2] = b;
					rgba[outIdx + 3] = 255;
				}
			} else if (bitsPerPixel === 24) {
				const pixOffset = rowOffset + x * 3;
				if (pixOffset + 3 <= u8.length) {
					const b0 = u8[pixOffset] ?? 0;
					const b1 = u8[pixOffset + 1] ?? 0;
					const b2 = u8[pixOffset + 2] ?? 0;
					const pixelVal =
						byteOrder === 1
							? (b0 << 16) | (b1 << 8) | b2
							: b0 | (b1 << 8) | (b2 << 16);
					const r = Math.round(
						(((pixelVal & rMask) >>> rInfo.shift) / rInfo.maxVal) * 255,
					);
					const g = Math.round(
						(((pixelVal & gMask) >>> gInfo.shift) / gInfo.maxVal) * 255,
					);
					const b = Math.round(
						(((pixelVal & bMask) >>> bInfo.shift) / bInfo.maxVal) * 255,
					);
					rgba[outIdx] = r;
					rgba[outIdx + 1] = g;
					rgba[outIdx + 2] = b;
					rgba[outIdx + 3] = 255;
				}
			} else if (bitsPerPixel === 16) {
				const pixOffset = rowOffset + x * 2;
				if (pixOffset + 2 <= u8.length) {
					const pixelVal =
						byteOrder === 1
							? view.getUint16(pixOffset, false)
							: view.getUint16(pixOffset, true);
					const r = Math.round(
						(((pixelVal & rMask) >>> rInfo.shift) / rInfo.maxVal) * 255,
					);
					const g = Math.round(
						(((pixelVal & gMask) >>> gInfo.shift) / gInfo.maxVal) * 255,
					);
					const b = Math.round(
						(((pixelVal & bMask) >>> bInfo.shift) / bInfo.maxVal) * 255,
					);
					rgba[outIdx] = r;
					rgba[outIdx + 1] = g;
					rgba[outIdx + 2] = b;
					rgba[outIdx + 3] = 255;
				}
			} else if (bitsPerPixel === 8) {
				const pixOffset = rowOffset + x;
				if (pixOffset < u8.length) {
					const val = u8[pixOffset] ?? 0;
					const entry = palette[val] ?? [val, val, val];
					rgba[outIdx] = entry[0];
					rgba[outIdx + 1] = entry[1];
					rgba[outIdx + 2] = entry[2];
					rgba[outIdx + 3] = 255;
				}
			} else if (bitsPerPixel === 1) {
				const byteIdx = rowOffset + Math.floor(x / 8);
				if (byteIdx < u8.length) {
					const bVal = u8[byteIdx] ?? 0;
					const bit =
						bitmapBitOrder === 1
							? (bVal >> (7 - (x % 8))) & 1
							: (bVal >> (x % 8)) & 1;
					if (ncolors >= 2) {
						const entry = palette[bit] ?? [bit * 255, bit * 255, bit * 255];
						rgba[outIdx] = entry[0];
						rgba[outIdx + 1] = entry[1];
						rgba[outIdx + 2] = entry[2];
						rgba[outIdx + 3] = 255;
					} else {
						const c = bit ? 255 : 0;
						rgba[outIdx] = c;
						rgba[outIdx + 1] = c;
						rgba[outIdx + 2] = c;
						rgba[outIdx + 3] = 255;
					}
				}
			}
		}
	}

	onProgress?.(0.85, "Encoding PNG");
	const png = encodeRgbaToPng(width, height, rgba);
	onProgress?.(1.0, "Complete");
	return png;
}
