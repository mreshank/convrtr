import { encodeRgbaToPng } from "../dds/parser";

export interface PcxMetadata {
	width: number;
	height: number;
	bitsPerPixel: number;
	planes: number;
	bytesPerLine: number;
	colorCount: number;
	pngBytes: Uint8Array;
}

// Standard 16-color EGA default palette (fallback if header palette is empty)
const DEFAULT_EGA_PALETTE: number[] = [
	0, 0, 0, 0, 0, 170, 0, 170, 0, 0, 170, 170, 170, 0, 0, 170, 0, 170, 170, 85,
	0, 170, 170, 170, 85, 85, 85, 85, 85, 255, 85, 255, 85, 85, 255, 255, 255, 85,
	85, 255, 85, 255, 255, 255, 85, 255, 255, 255,
];

/**
 * Decodes a ZSoft PCX bitmap into a standard 32-bit RGBA PNG.
 * Handles 1-bit monochrome, 4-bit EGA planar/packed, 8-bit 256-color indexed,
 * and 24-bit planar RGB formats with run-length encoding.
 */
export function parsePcx(fileBytes: Uint8Array): PcxMetadata {
	if (fileBytes.length < 128) {
		throw new Error(
			"Invalid PCX file: File size is smaller than the 128-byte PCX header.",
		);
	}

	const manufacturer = fileBytes[0] ?? 0;
	if (manufacturer !== 0x0a) {
		throw new Error(
			`Invalid PCX signature: Expected 0x0A (ZSoft ID), received 0x${manufacturer.toString(16).padStart(2, "0")}.`,
		);
	}

	const encoding = fileBytes[2] ?? 0;
	if (encoding !== 1) {
		throw new Error(
			`Unsupported PCX encoding type: ${encoding}. Only RLE encoding (1) is supported.`,
		);
	}

	const bitsPerPixel = fileBytes[3] ?? 8;
	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const xMin = view.getUint16(4, true);
	const yMin = view.getUint16(6, true);
	const xMax = view.getUint16(8, true);
	const yMax = view.getUint16(10, true);

	if (xMax < xMin || yMax < yMin) {
		throw new Error(
			`Invalid PCX bounding box: (${xMin}, ${yMin}) to (${xMax}, ${yMax}).`,
		);
	}

	const width = xMax - xMin + 1;
	const height = yMax - yMin + 1;

	if (width === 0 || height === 0 || width > 16384 || height > 16384) {
		throw new Error(
			`Invalid PCX image dimensions: ${width}x${height}. Dimensions out of valid range.`,
		);
	}

	const planes = fileBytes[65] ?? 1;
	const bytesPerLine = view.getUint16(66, true);

	if (bytesPerLine < Math.ceil((width * bitsPerPixel) / 8) && planes === 1) {
		throw new Error(
			`Corrupt PCX header: bytesPerLine (${bytesPerLine}) is insufficient for image width (${width}).`,
		);
	}

	// Decompress RLE stream scanlines
	const totalScanlineBytes = bytesPerLine * planes;
	const decompressedScanlines = new Uint8Array(height * totalScanlineBytes);

	let srcOffset = 128;
	let dstOffset = 0;
	const maxDst = decompressedScanlines.length;

	while (dstOffset < maxDst && srcOffset < fileBytes.length) {
		// Stop if we hit trailing 256-color palette marker in 8-bit images
		if (
			bitsPerPixel === 8 &&
			planes === 1 &&
			srcOffset === fileBytes.length - 769 &&
			fileBytes[srcOffset] === 0x0c
		) {
			break;
		}

		const byte = fileBytes[srcOffset] ?? 0;
		srcOffset++;

		if ((byte & 0xc0) === 0xc0) {
			const count = byte & 0x3f;
			if (srcOffset >= fileBytes.length) break;
			const val = fileBytes[srcOffset] ?? 0;
			srcOffset++;

			const fillEnd = Math.min(dstOffset + count, maxDst);
			decompressedScanlines.fill(val, dstOffset, fillEnd);
			dstOffset = fillEnd;
		} else {
			decompressedScanlines[dstOffset] = byte;
			dstOffset++;
		}
	}

	const rgba = new Uint8Array(width * height * 4);
	let colorCount = 2;

	// Case 1: 8-bit indexed (256 colors)
	if (bitsPerPixel === 8 && planes === 1) {
		colorCount = 256;
		const palette = new Uint8Array(768);

		// Check for trailing 256-color palette (marker 0x0C + 768 RGB bytes)
		if (fileBytes.length >= 769 && fileBytes[fileBytes.length - 769] === 0x0c) {
			palette.set(fileBytes.subarray(fileBytes.length - 768));
		} else if (fileBytes.length >= 768) {
			palette.set(fileBytes.subarray(fileBytes.length - 768));
		} else {
			// Grayscale fallback
			for (let i = 0; i < 256; i++) {
				palette[i * 3] = i;
				palette[i * 3 + 1] = i;
				palette[i * 3 + 2] = i;
			}
		}

		for (let y = 0; y < height; y++) {
			const lineOffset = y * totalScanlineBytes;
			for (let x = 0; x < width; x++) {
				const palIndex = decompressedScanlines[lineOffset + x] ?? 0;
				const dstIdx = (y * width + x) * 4;
				rgba[dstIdx] = palette[palIndex * 3] ?? 0;
				rgba[dstIdx + 1] = palette[palIndex * 3 + 1] ?? 0;
				rgba[dstIdx + 2] = palette[palIndex * 3 + 2] ?? 0;
				rgba[dstIdx + 3] = 255;
			}
		}
	}
	// Case 2: 24-bit TrueColor (8 bits per pixel, 3 planes: R, G, B)
	else if (bitsPerPixel === 8 && planes === 3) {
		colorCount = 16777216;
		for (let y = 0; y < height; y++) {
			const lineOffset = y * totalScanlineBytes;
			const rOffset = lineOffset;
			const gOffset = lineOffset + bytesPerLine;
			const bOffset = lineOffset + bytesPerLine * 2;

			for (let x = 0; x < width; x++) {
				const dstIdx = (y * width + x) * 4;
				rgba[dstIdx] = decompressedScanlines[rOffset + x] ?? 0;
				rgba[dstIdx + 1] = decompressedScanlines[gOffset + x] ?? 0;
				rgba[dstIdx + 2] = decompressedScanlines[bOffset + x] ?? 0;
				rgba[dstIdx + 3] = 255;
			}
		}
	}
	// Case 3: 4-bit (16 colors) - either 1 bpp across 4 planes, or 4 bpp 1 plane
	else if (
		(bitsPerPixel === 1 && planes === 4) ||
		(bitsPerPixel === 4 && planes === 1)
	) {
		colorCount = 16;
		const egaPalette = new Uint8Array(48);
		// Check if header contains a valid palette (bytes 16..63)
		let hasHeaderPalette = false;
		for (let i = 16; i < 64; i++) {
			if ((fileBytes[i] ?? 0) !== 0) {
				hasHeaderPalette = true;
				break;
			}
		}

		if (hasHeaderPalette) {
			egaPalette.set(fileBytes.subarray(16, 64));
		} else {
			for (let i = 0; i < 48; i++) {
				egaPalette[i] = DEFAULT_EGA_PALETTE[i] ?? 0;
			}
		}

		if (bitsPerPixel === 1 && planes === 4) {
			// Planar EGA: 4 planes (bit 0, bit 1, bit 2, bit 3)
			for (let y = 0; y < height; y++) {
				const lineOffset = y * totalScanlineBytes;
				for (let x = 0; x < width; x++) {
					const byteIdx = Math.floor(x / 8);
					const bitPos = 7 - (x % 8);

					const p0 =
						((decompressedScanlines[lineOffset + byteIdx] ?? 0) >> bitPos) & 1;
					const p1 =
						((decompressedScanlines[lineOffset + bytesPerLine + byteIdx] ??
							0) >>
							bitPos) &
						1;
					const p2 =
						((decompressedScanlines[lineOffset + bytesPerLine * 2 + byteIdx] ??
							0) >>
							bitPos) &
						1;
					const p3 =
						((decompressedScanlines[lineOffset + bytesPerLine * 3 + byteIdx] ??
							0) >>
							bitPos) &
						1;

					const colorIdx = p0 | (p1 << 1) | (p2 << 2) | (p3 << 3);
					const dstIdx = (y * width + x) * 4;
					rgba[dstIdx] = egaPalette[colorIdx * 3] ?? 0;
					rgba[dstIdx + 1] = egaPalette[colorIdx * 3 + 1] ?? 0;
					rgba[dstIdx + 2] = egaPalette[colorIdx * 3 + 2] ?? 0;
					rgba[dstIdx + 3] = 255;
				}
			}
		} else {
			// Packed 4-bit
			for (let y = 0; y < height; y++) {
				const lineOffset = y * totalScanlineBytes;
				for (let x = 0; x < width; x++) {
					const byteVal =
						decompressedScanlines[lineOffset + Math.floor(x / 2)] ?? 0;
					const colorIdx = x % 2 === 0 ? (byteVal >> 4) & 0x0f : byteVal & 0x0f;
					const dstIdx = (y * width + x) * 4;
					rgba[dstIdx] = egaPalette[colorIdx * 3] ?? 0;
					rgba[dstIdx + 1] = egaPalette[colorIdx * 3 + 1] ?? 0;
					rgba[dstIdx + 2] = egaPalette[colorIdx * 3 + 2] ?? 0;
					rgba[dstIdx + 3] = 255;
				}
			}
		}
	}
	// Case 4: 1-bit Monochrome (1 bpp, 1 plane)
	else if (bitsPerPixel === 1 && planes === 1) {
		colorCount = 2;
		for (let y = 0; y < height; y++) {
			const lineOffset = y * totalScanlineBytes;
			for (let x = 0; x < width; x++) {
				const byteVal =
					decompressedScanlines[lineOffset + Math.floor(x / 8)] ?? 0;
				const bit = (byteVal >> (7 - (x % 8))) & 1;
				const val = bit ? 255 : 0;
				const dstIdx = (y * width + x) * 4;
				rgba[dstIdx] = val;
				rgba[dstIdx + 1] = val;
				rgba[dstIdx + 2] = val;
				rgba[dstIdx + 3] = 255;
			}
		}
	} else {
		throw new Error(
			`Unsupported PCX configuration: ${bitsPerPixel} bits per pixel across ${planes} planes.`,
		);
	}

	const pngBytes = encodeRgbaToPng(width, height, rgba);

	return {
		width,
		height,
		bitsPerPixel,
		planes,
		bytesPerLine,
		colorCount,
		pngBytes,
	};
}

/**
 * High-level engine runner for converting PCX images to PNG.
 */
export function convertPcxToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading PCX header");
	const bytes = new Uint8Array(input);
	onProgress?.(0.4, "Decompressing RLE scanlines");
	const metadata = parsePcx(bytes);
	onProgress?.(0.9, "Encoding PNG image");
	return metadata.pngBytes.buffer.slice(
		metadata.pngBytes.byteOffset,
		metadata.pngBytes.byteOffset + metadata.pngBytes.byteLength,
	) as ArrayBuffer;
}
