import { encodeRgbaToPng } from "../dds/parser";

export interface IffMetadata {
	width: number;
	height: number;
	nPlanes: number;
	format: "ILBM" | "PBM";
	compression: number;
	masking: number;
	colorCount: number;
	pngBytes: Uint8Array;
}

export interface IffRgbColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Decompresses an Amiga ByteRun1 RLE byte stream into uncompressed bytes.
 */
export function decompressByteRun1(
	src: Uint8Array,
	targetLength: number,
): Uint8Array {
	const dst = new Uint8Array(targetLength);
	let srcPos = 0;
	let dstPos = 0;

	while (srcPos < src.length && dstPos < targetLength) {
		const b = src[srcPos++];
		if (b === undefined) break;

		if (b <= 127) {
			// Literal run of (b + 1) bytes
			const count = b + 1;
			for (
				let i = 0;
				i < count && srcPos < src.length && dstPos < targetLength;
				i++
			) {
				const byte = src[srcPos++];
				if (byte !== undefined) {
					dst[dstPos++] = byte;
				}
			}
		} else if (b >= 129) {
			// Replicate next byte (257 - b) times
			const count = 257 - b;
			if (srcPos < src.length) {
				const val = src[srcPos++] ?? 0;
				for (let i = 0; i < count && dstPos < targetLength; i++) {
					dst[dstPos++] = val;
				}
			}
		}
		// b === 128 (0x80) is NOP
	}

	return dst;
}

/**
 * Parses Commodore Amiga & Electronic Arts IFF-ILBM / PBM image files
 * and decodes them into standard 32-bit RGBA PNGs.
 */
export function parseIff(fileBytes: Uint8Array): IffMetadata {
	if (fileBytes.length < 12) {
		throw new Error(
			"Invalid IFF file: File size is smaller than the 12-byte header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	// FORM header check
	const formTag = String.fromCharCode(
		fileBytes[0] ?? 0,
		fileBytes[1] ?? 0,
		fileBytes[2] ?? 0,
		fileBytes[3] ?? 0,
	);
	if (formTag !== "FORM") {
		throw new Error(
			`Invalid IFF signature: Expected FORM header, found '${formTag}'.`,
		);
	}

	const formType = String.fromCharCode(
		fileBytes[8] ?? 0,
		fileBytes[9] ?? 0,
		fileBytes[10] ?? 0,
		fileBytes[11] ?? 0,
	);
	if (formType !== "ILBM" && formType !== "PBM ") {
		throw new Error(
			`Unsupported IFF format type: '${formType}'. Expected ILBM or PBM.`,
		);
	}
	const isPbm = formType === "PBM ";

	let width = 0;
	let height = 0;
	let nPlanes = 0;
	let masking = 0;
	let compression = 0;
	let transparentColor = -1;
	let camgMode = 0;
	let hasBmhd = false;

	const palette: IffRgbColor[] = [];
	let bodyData: Uint8Array | null = null;

	let offset = 12;
	while (offset + 8 <= fileBytes.length) {
		const chunkId = String.fromCharCode(
			fileBytes[offset] ?? 0,
			fileBytes[offset + 1] ?? 0,
			fileBytes[offset + 2] ?? 0,
			fileBytes[offset + 3] ?? 0,
		);
		const chunkSize = view.getUint32(offset + 4, false); // Big-Endian
		const dataOffset = offset + 8;
		const nextOffset = dataOffset + chunkSize + (chunkSize % 2 !== 0 ? 1 : 0);

		if (dataOffset + chunkSize > fileBytes.length) {
			break;
		}

		if (chunkId === "BMHD" && chunkSize >= 20) {
			hasBmhd = true;
			width = view.getUint16(dataOffset, false);
			height = view.getUint16(dataOffset + 2, false);
			nPlanes = fileBytes[dataOffset + 8] ?? 0;
			masking = fileBytes[dataOffset + 9] ?? 0;
			compression = fileBytes[dataOffset + 10] ?? 0;
			if (masking === 2) {
				transparentColor = view.getUint16(dataOffset + 12, false);
			}
		} else if (chunkId === "CMAP") {
			const colorCount = Math.floor(chunkSize / 3);
			for (let i = 0; i < colorCount; i++) {
				const cOffset = dataOffset + i * 3;
				const r = fileBytes[cOffset] ?? 0;
				const g = fileBytes[cOffset + 1] ?? 0;
				const b = fileBytes[cOffset + 2] ?? 0;
				palette.push({ r, g, b, a: 255 });
			}
		} else if (chunkId === "CAMG" && chunkSize >= 4) {
			camgMode = view.getUint32(dataOffset, false);
		} else if (chunkId === "BODY") {
			bodyData = fileBytes.subarray(dataOffset, dataOffset + chunkSize);
		}

		offset = nextOffset;
	}

	if (!hasBmhd) {
		throw new Error("Invalid IFF file: Missing required BMHD header chunk.");
	}
	if (width <= 0 || height <= 0 || width > 16384 || height > 16384) {
		throw new Error(`Invalid IFF dimensions: ${width}x${height}.`);
	}
	if (!bodyData) {
		throw new Error("Invalid IFF file: Missing BODY pixel data chunk.");
	}

	// Default fallback palette if CMAP is missing
	const maxColors = 1 << Math.min(nPlanes, 8);
	while (palette.length < maxColors) {
		const idx = palette.length;
		const step = maxColors > 1 ? Math.floor((idx * 255) / (maxColors - 1)) : 0;
		palette.push({ r: step, g: step, b: step, a: 255 });
	}

	// Check for Extra Half-Brite (EHB) mode: 6 planes with 32 colors in CMAP, or CAMG bit 0x0080
	const isEhb =
		nPlanes === 6 && (palette.length === 32 || (camgMode & 0x0080) !== 0);
	if (isEhb && palette.length === 32) {
		for (let i = 0; i < 32; i++) {
			const base = palette[i] ?? { r: 0, g: 0, b: 0, a: 255 };
			palette.push({
				r: base.r >> 1,
				g: base.g >> 1,
				b: base.b >> 1,
				a: 255,
			});
		}
	}

	// Check for Hold-And-Modify (HAM) mode
	const isHam6 =
		nPlanes === 6 &&
		((camgMode & 0x0800) !== 0 || (palette.length === 16 && !isEhb));

	const canvas = new Uint8Array(width * height * 4);

	if (isPbm) {
		// Packed BitMap (chunky 1 byte per pixel)
		const rowBytes = width + (width % 2 !== 0 ? 1 : 0);
		const totalUnpackedSize = rowBytes * height;
		const pixels =
			compression === 1
				? decompressByteRun1(bodyData, totalUnpackedSize)
				: bodyData;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const srcIdx = y * rowBytes + x;
				const palIdx = pixels[srcIdx] ?? 0;
				const dstIdx = (y * width + x) * 4;

				if (masking === 2 && palIdx === transparentColor) {
					canvas[dstIdx + 3] = 0;
				} else {
					const col = palette[palIdx] ?? { r: 0, g: 0, b: 0, a: 255 };
					canvas[dstIdx] = col.r;
					canvas[dstIdx + 1] = col.g;
					canvas[dstIdx + 2] = col.b;
					canvas[dstIdx + 3] = col.a;
				}
			}
		}
	} else {
		// Standard ILBM (planar)
		const rowBytes = Math.floor((width + 15) / 16) * 2;
		const totalPlanes = nPlanes + (masking === 1 ? 1 : 0);
		const totalUnpackedSize = rowBytes * totalPlanes * height;
		const decompressedData =
			compression === 1
				? decompressByteRun1(bodyData, totalUnpackedSize)
				: bodyData;

		for (let y = 0; y < height; y++) {
			let hamLastR = 0;
			let hamLastG = 0;
			let hamLastB = 0;

			const rowOffset = y * rowBytes * totalPlanes;

			for (let x = 0; x < width; x++) {
				const byteIdx = Math.floor(x / 8);
				const bitIdx = 7 - (x % 8);
				const dstIdx = (y * width + x) * 4;

				let isMasked = false;
				if (masking === 1) {
					// Last plane is mask
					const maskPlaneOffset = rowOffset + nPlanes * rowBytes;
					const maskByte = decompressedData[maskPlaneOffset + byteIdx] ?? 0;
					isMasked = ((maskByte >> bitIdx) & 1) === 0;
				}

				if (isMasked) {
					canvas[dstIdx + 3] = 0;
					continue;
				}

				if (nPlanes === 24) {
					// 24-bit TrueColor ILBM: 8 planes R, 8 planes G, 8 planes B
					let r = 0;
					let g = 0;
					let b = 0;

					for (let p = 0; p < 8; p++) {
						const pOffset = rowOffset + p * rowBytes;
						const byteVal = decompressedData[pOffset + byteIdx] ?? 0;
						r |= ((byteVal >> bitIdx) & 1) << p;
					}
					for (let p = 0; p < 8; p++) {
						const pOffset = rowOffset + (p + 8) * rowBytes;
						const byteVal = decompressedData[pOffset + byteIdx] ?? 0;
						g |= ((byteVal >> bitIdx) & 1) << p;
					}
					for (let p = 0; p < 8; p++) {
						const pOffset = rowOffset + (p + 16) * rowBytes;
						const byteVal = decompressedData[pOffset + byteIdx] ?? 0;
						b |= ((byteVal >> bitIdx) & 1) << p;
					}

					canvas[dstIdx] = r;
					canvas[dstIdx + 1] = g;
					canvas[dstIdx + 2] = b;
					canvas[dstIdx + 3] = 255;
				} else {
					// Indexed 1..8 planes
					let pixelValue = 0;
					for (let p = 0; p < nPlanes; p++) {
						const pOffset = rowOffset + p * rowBytes;
						const byteVal = decompressedData[pOffset + byteIdx] ?? 0;
						pixelValue |= ((byteVal >> bitIdx) & 1) << p;
					}

					if (masking === 2 && pixelValue === transparentColor) {
						canvas[dstIdx + 3] = 0;
					} else if (isHam6) {
						// HAM6: bits 4-5 control modify operation, bits 0-3 give value
						const mode = (pixelValue >> 4) & 3;
						const dataVal = pixelValue & 0x0f;
						const sample8 = (dataVal << 4) | dataVal;

						if (mode === 0) {
							// Palette color lookup
							const col = palette[dataVal] ?? {
								r: 0,
								g: 0,
								b: 0,
								a: 255,
							};
							hamLastR = col.r;
							hamLastG = col.g;
							hamLastB = col.b;
						} else if (mode === 1) {
							// Modify Blue
							hamLastB = sample8;
						} else if (mode === 2) {
							// Modify Red
							hamLastR = sample8;
						} else if (mode === 3) {
							// Modify Green
							hamLastG = sample8;
						}

						canvas[dstIdx] = hamLastR;
						canvas[dstIdx + 1] = hamLastG;
						canvas[dstIdx + 2] = hamLastB;
						canvas[dstIdx + 3] = 255;
					} else {
						// Standard Indexed / EHB
						const col = palette[pixelValue] ?? {
							r: 0,
							g: 0,
							b: 0,
							a: 255,
						};
						canvas[dstIdx] = col.r;
						canvas[dstIdx + 1] = col.g;
						canvas[dstIdx + 2] = col.b;
						canvas[dstIdx + 3] = col.a;
					}
				}
			}
		}
	}

	const pngBytes = encodeRgbaToPng(width, height, canvas);

	return {
		width,
		height,
		nPlanes,
		format: isPbm ? "PBM" : "ILBM",
		compression,
		masking,
		colorCount: palette.length,
		pngBytes,
	};
}

/**
 * High-level engine runner for converting Amiga IFF/ILBM files to PNG.
 */
export function convertIffToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading IFF chunk hierarchy");
	const bytes = new Uint8Array(input);
	onProgress?.(0.4, "Decompressing ByteRun1 bitplanes and decoding colors");
	const metadata = parseIff(bytes);
	onProgress?.(0.9, "Encoding PNG image");
	return metadata.pngBytes.buffer.slice(
		metadata.pngBytes.byteOffset,
		metadata.pngBytes.byteOffset + metadata.pngBytes.byteLength,
	) as ArrayBuffer;
}
