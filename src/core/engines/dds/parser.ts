import { zlibSync } from "fflate";

/**
 * DirectDraw Surface (.dds) texture decoder and PNG synthesizer.
 * Supports DXT1 (BC1), DXT3 (BC2), DXT5 (BC3), BC5/ATI2 (normal maps),
 * and uncompressed 32-bit / 24-bit RGBA/BGRA game textures.
 */

// CRC32 table for PNG chunk generation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	CRC_TABLE[n] = c;
}

function calculateCrc32(buf: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		const byte = buf[i] ?? 0;
		c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

/**
 * Pure TypeScript PNG encoder (no DOM or Canvas required).
 */
export function encodeRgbaToPng(
	width: number,
	height: number,
	rgba: Uint8Array,
): Uint8Array {
	const rowBytes = width * 4;
	const rawScanlines = new Uint8Array(height * (1 + rowBytes));

	for (let y = 0; y < height; y++) {
		const rawOffset = y * (1 + rowBytes);
		rawScanlines[rawOffset] = 0; // Filter type 0 (None)
		rawScanlines.set(
			rgba.subarray(y * rowBytes, (y + 1) * rowBytes),
			rawOffset + 1,
		);
	}

	const compressedIdat = zlibSync(rawScanlines, { level: 6 });

	const signature = new Uint8Array([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);

	function createChunk(type: string, data: Uint8Array): Uint8Array {
		const len = data.length;
		const chunk = new Uint8Array(8 + len + 4);
		const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
		view.setUint32(0, len, false);
		for (let i = 0; i < 4; i++) {
			chunk[4 + i] = type.charCodeAt(i);
		}
		chunk.set(data, 8);
		const crc = calculateCrc32(chunk.subarray(4, 8 + len));
		view.setUint32(8 + len, crc, false);
		return chunk;
	}

	const ihdrData = new Uint8Array(13);
	const ihdrView = new DataView(ihdrData.buffer);
	ihdrView.setUint32(0, width, false);
	ihdrView.setUint32(4, height, false);
	ihdrData[8] = 8; // 8 bits per channel
	ihdrData[9] = 6; // RGBA color type
	ihdrData[10] = 0;
	ihdrData[11] = 0;
	ihdrData[12] = 0;

	const ihdrChunk = createChunk("IHDR", ihdrData);
	const idatChunk = createChunk("IDAT", compressedIdat);
	const iendChunk = createChunk("IEND", new Uint8Array(0));

	const totalSize =
		signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
	const png = new Uint8Array(totalSize);
	let offset = 0;
	png.set(signature, offset);
	offset += signature.length;
	png.set(ihdrChunk, offset);
	offset += ihdrChunk.length;
	png.set(idatChunk, offset);
	offset += idatChunk.length;
	png.set(iendChunk, offset);

	return png;
}

// DDS Header Constants
const DDS_MAGIC = 0x20534444; // "DDS " in little endian
const DDPF_FOURCC = 0x00000004;
const DDPF_RGB = 0x00000040;
const DDPF_ALPHAPIXELS = 0x00000001;

// FourCC Identifiers
const FOURCC_DXT1 = 0x31545844; // "DXT1"
const FOURCC_DXT3 = 0x33545844; // "DXT3"
const FOURCC_DXT5 = 0x35545844; // "DXT5"
const FOURCC_ATI2 = 0x32495441; // "ATI2" / BC5
const FOURCC_BC5U = 0x55354342; // "BC5U"
const FOURCC_DX10 = 0x30315844; // "DX10"

function unpack565(c: number): [number, number, number] {
	const r = Math.round(((c >> 11) & 0x1f) * (255 / 31));
	const g = Math.round(((c >> 5) & 0x3f) * (255 / 63));
	const b = Math.round((c & 0x1f) * (255 / 31));
	return [r, g, b];
}

/**
 * Decodes a 4x4 DXT1 block into output RGBA buffer.
 */
export function decodeDxt1Block(
	src: Uint8Array,
	srcOffset: number,
	dst: Uint8Array,
	blockX: number,
	blockY: number,
	imgWidth: number,
	imgHeight: number,
	isDxt1Alpha: boolean,
) {
	const b0 = src[srcOffset] ?? 0;
	const b1 = src[srcOffset + 1] ?? 0;
	const b2 = src[srcOffset + 2] ?? 0;
	const b3 = src[srcOffset + 3] ?? 0;

	const c0 = b0 | (b1 << 8);
	const c1 = b2 | (b3 << 8);

	const [r0, g0, b0c] = unpack565(c0);
	const [r1, g1, b1c] = unpack565(c1);

	const colors: [number, number, number, number][] = [
		[r0, g0, b0c, 255],
		[r1, g1, b1c, 255],
		[0, 0, 0, 255],
		[0, 0, 0, 255],
	];

	if (c0 > c1 || !isDxt1Alpha) {
		colors[2] = [
			Math.round((2 * r0 + r1) / 3),
			Math.round((2 * g0 + g1) / 3),
			Math.round((2 * b0c + b1c) / 3),
			255,
		];
		colors[3] = [
			Math.round((r0 + 2 * r1) / 3),
			Math.round((g0 + 2 * g1) / 3),
			Math.round((b0c + 2 * b1c) / 3),
			255,
		];
	} else {
		colors[2] = [
			Math.round((r0 + r1) / 2),
			Math.round((g0 + g1) / 2),
			Math.round((b0c + b1c) / 2),
			255,
		];
		colors[3] = [0, 0, 0, 0]; // 1-bit transparent
	}

	const lookup =
		(src[srcOffset + 4] ?? 0) |
		((src[srcOffset + 5] ?? 0) << 8) |
		((src[srcOffset + 6] ?? 0) << 16) |
		((src[srcOffset + 7] ?? 0) << 24);

	for (let py = 0; py < 4; py++) {
		const y = blockY * 4 + py;
		if (y >= imgHeight) break;

		for (let px = 0; px < 4; px++) {
			const x = blockX * 4 + px;
			if (x >= imgWidth) break;

			const bitShift = (py * 4 + px) * 2;
			const code = (lookup >>> bitShift) & 0x3;
			const col = colors[code] ?? [0, 0, 0, 255];

			const dstIdx = (y * imgWidth + x) * 4;
			dst[dstIdx] = col[0];
			dst[dstIdx + 1] = col[1];
			dst[dstIdx + 2] = col[2];
			dst[dstIdx + 3] = col[3];
		}
	}
}

/**
 * Decodes DXT3 texture (BC2).
 */
function decodeDxt3(
	src: Uint8Array,
	srcOffset: number,
	width: number,
	height: number,
): Uint8Array {
	const dst = new Uint8Array(width * height * 4);
	const blocksX = Math.ceil(width / 4);
	const blocksY = Math.ceil(height / 4);

	let offset = srcOffset;

	for (let by = 0; by < blocksY; by++) {
		for (let bx = 0; bx < blocksX; bx++) {
			// Read 8 bytes of explicit 4-bit alpha
			const a0 = (src[offset] ?? 0) | ((src[offset + 1] ?? 0) << 8);
			const a1 = (src[offset + 2] ?? 0) | ((src[offset + 3] ?? 0) << 8);
			const a2 = (src[offset + 4] ?? 0) | ((src[offset + 5] ?? 0) << 8);
			const a3 = (src[offset + 6] ?? 0) | ((src[offset + 7] ?? 0) << 8);
			const alphaRows = [a0, a1, a2, a3];

			// Decode color using DXT1 color block
			decodeDxt1Block(
				src,
				offset + 8,
				dst,
				bx,
				by,
				width,
				height,
				false, // DXT3 always uses 4 colors
			);

			// Overwrite alpha
			for (let py = 0; py < 4; py++) {
				const y = by * 4 + py;
				if (y >= height) break;
				const rowAlpha = alphaRows[py] ?? 0;

				for (let px = 0; px < 4; px++) {
					const x = bx * 4 + px;
					if (x >= width) break;

					const alphaNibble = (rowAlpha >>> (px * 4)) & 0xf;
					const alphaVal = alphaNibble * 17; // maps 0..15 to 0..255

					const dstIdx = (y * width + x) * 4 + 3;
					dst[dstIdx] = alphaVal;
				}
			}

			offset += 16;
		}
	}

	return dst;
}

/**
 * Decodes 8-byte interpolated alpha block (used in DXT5 and BC4/BC5).
 */
function decodeInterpolatedAlphaBlock(
	src: Uint8Array,
	offset: number,
): Uint8Array {
	const alphas = new Uint8Array(8);
	const a0 = src[offset] ?? 0;
	const a1 = src[offset + 1] ?? 0;
	alphas[0] = a0;
	alphas[1] = a1;

	if (a0 > a1) {
		for (let i = 1; i <= 6; i++) {
			alphas[i + 1] = Math.round(((7 - i) * a0 + i * a1) / 7);
		}
	} else {
		for (let i = 1; i <= 4; i++) {
			alphas[i + 1] = Math.round(((5 - i) * a0 + i * a1) / 5);
		}
		alphas[6] = 0;
		alphas[7] = 255;
	}

	// 48 bits of alpha indices (16 x 3 bits)
	const result = new Uint8Array(16);
	const bits0 =
		(src[offset + 2] ?? 0) |
		((src[offset + 3] ?? 0) << 8) |
		((src[offset + 4] ?? 0) << 16);
	const bits1 =
		(src[offset + 5] ?? 0) |
		((src[offset + 6] ?? 0) << 8) |
		((src[offset + 7] ?? 0) << 16);

	for (let i = 0; i < 8; i++) {
		const idx = (bits0 >>> (i * 3)) & 0x7;
		result[i] = alphas[idx] ?? 0;
	}
	for (let i = 0; i < 8; i++) {
		const idx = (bits1 >>> (i * 3)) & 0x7;
		result[8 + i] = alphas[idx] ?? 0;
	}

	return result;
}

/**
 * Decodes DXT5 texture (BC3).
 */
export function decodeDxt5(
	src: Uint8Array,
	srcOffset: number,
	width: number,
	height: number,
): Uint8Array {
	const dst = new Uint8Array(width * height * 4);
	const blocksX = Math.ceil(width / 4);
	const blocksY = Math.ceil(height / 4);

	let offset = srcOffset;

	for (let by = 0; by < blocksY; by++) {
		for (let bx = 0; bx < blocksX; bx++) {
			// Interpolated alpha (8 bytes)
			const blockAlphas = decodeInterpolatedAlphaBlock(src, offset);

			// Decode color using DXT1 color block (offset + 8)
			decodeDxt1Block(src, offset + 8, dst, bx, by, width, height, false);

			// Overwrite alpha with interpolated values
			for (let py = 0; py < 4; py++) {
				const y = by * 4 + py;
				if (y >= height) break;

				for (let px = 0; px < 4; px++) {
					const x = bx * 4 + px;
					if (x >= width) break;

					const alphaVal = blockAlphas[py * 4 + px] ?? 255;
					const dstIdx = (y * width + x) * 4 + 3;
					dst[dstIdx] = alphaVal;
				}
			}

			offset += 16;
		}
	}

	return dst;
}

/**
 * Decodes BC5 / ATI2 normal maps (two channels: Red and Green, with reconstructed Blue).
 */
function decodeBc5(
	src: Uint8Array,
	srcOffset: number,
	width: number,
	height: number,
): Uint8Array {
	const dst = new Uint8Array(width * height * 4);
	const blocksX = Math.ceil(width / 4);
	const blocksY = Math.ceil(height / 4);

	let offset = srcOffset;

	for (let by = 0; by < blocksY; by++) {
		for (let bx = 0; bx < blocksX; bx++) {
			const redAlphas = decodeInterpolatedAlphaBlock(src, offset);
			const greenAlphas = decodeInterpolatedAlphaBlock(src, offset + 8);

			for (let py = 0; py < 4; py++) {
				const y = by * 4 + py;
				if (y >= height) break;

				for (let px = 0; px < 4; px++) {
					const x = bx * 4 + px;
					if (x >= width) break;

					const r = redAlphas[py * 4 + px] ?? 0;
					const g = greenAlphas[py * 4 + px] ?? 0;

					// Tangent space normal reconstruction: Z = sqrt(max(0, 1 - X^2 - Y^2))
					const nx = (r / 255) * 2 - 1;
					const ny = (g / 255) * 2 - 1;
					const nz2 = Math.max(0, 1 - nx * nx - ny * ny);
					const nz = Math.sqrt(nz2);
					const b = Math.round(((nz + 1) / 2) * 255);

					const dstIdx = (y * width + x) * 4;
					dst[dstIdx] = r;
					dst[dstIdx + 1] = g;
					dst[dstIdx + 2] = b;
					dst[dstIdx + 3] = 255;
				}
			}

			offset += 16;
		}
	}

	return dst;
}

/**
 * Decodes uncompressed 32-bit / 24-bit RGB/RGBA/BGRA DDS image.
 */
function decodeUncompressedDds(
	src: Uint8Array,
	srcOffset: number,
	width: number,
	height: number,
	bpp: number,
	rMask: number,
	bMask: number,
): Uint8Array {
	const dst = new Uint8Array(width * height * 4);
	const bytesPerPixel = bpp / 8;
	const isBgra = rMask === 0x00ff0000 && bMask === 0x000000ff;

	let srcIdx = srcOffset;
	let dstIdx = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (bytesPerPixel === 4) {
				const b0 = src[srcIdx] ?? 0;
				const b1 = src[srcIdx + 1] ?? 0;
				const b2 = src[srcIdx + 2] ?? 0;
				const b3 = src[srcIdx + 3] ?? 255;

				if (isBgra) {
					dst[dstIdx] = b2; // R
					dst[dstIdx + 1] = b1; // G
					dst[dstIdx + 2] = b0; // B
					dst[dstIdx + 3] = b3; // A
				} else {
					dst[dstIdx] = b0;
					dst[dstIdx + 1] = b1;
					dst[dstIdx + 2] = b2;
					dst[dstIdx + 3] = b3;
				}
			} else if (bytesPerPixel === 3) {
				const b0 = src[srcIdx] ?? 0;
				const b1 = src[srcIdx + 1] ?? 0;
				const b2 = src[srcIdx + 2] ?? 0;

				if (isBgra) {
					dst[dstIdx] = b2; // R
					dst[dstIdx + 1] = b1; // G
					dst[dstIdx + 2] = b0; // B
					dst[dstIdx + 3] = 255;
				} else {
					dst[dstIdx] = b0;
					dst[dstIdx + 1] = b1;
					dst[dstIdx + 2] = b2;
					dst[dstIdx + 3] = 255;
				}
			}
			srcIdx += bytesPerPixel;
			dstIdx += 4;
		}
	}

	return dst;
}

/**
 * Main parser entry point: parses DDS header, decompresses texture blocks, and writes a standard PNG.
 */
export function convertDdsToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "READ_HEADER");
	if (input.byteLength < 128) {
		throw new Error(
			"convertDds: File is too small to be a valid DirectDraw Surface (.dds) container",
		);
	}

	const view = new DataView(input);
	const magic = view.getUint32(0, true);

	if (magic !== DDS_MAGIC) {
		throw new Error(
			"convertDds: Invalid magic header (expected 'DDS ' signature)",
		);
	}

	const height = view.getUint32(12, true);
	const width = view.getUint32(16, true);

	if (width === 0 || height === 0 || width > 16384 || height > 16384) {
		throw new Error(
			`convertDds: Invalid texture dimensions (${width}x${height})`,
		);
	}

	const pixelFormatFlags = view.getUint32(88, true);
	const fourCC = view.getUint32(92, true);
	const rgbBitCount = view.getUint32(96, true);
	const rBitMask = view.getUint32(100, true);
	const bBitMask = view.getUint32(108, true);

	let dataOffset = 128;
	if (fourCC === FOURCC_DX10 && input.byteLength >= 148) {
		dataOffset = 148; // Skip DX10 extension header
	}

	const srcBytes = new Uint8Array(input);
	let decodedRgba: Uint8Array;

	onProgress?.(0.3, "DECODE_PIXELS");

	if (pixelFormatFlags & DDPF_FOURCC) {
		switch (fourCC) {
			case FOURCC_DXT1: {
				decodedRgba = new Uint8Array(width * height * 4);
				const blocksX = Math.ceil(width / 4);
				const blocksY = Math.ceil(height / 4);
				let off = dataOffset;
				for (let by = 0; by < blocksY; by++) {
					for (let bx = 0; bx < blocksX; bx++) {
						decodeDxt1Block(
							srcBytes,
							off,
							decodedRgba,
							bx,
							by,
							width,
							height,
							true,
						);
						off += 8;
					}
				}
				break;
			}

			case FOURCC_DXT3:
				decodedRgba = decodeDxt3(srcBytes, dataOffset, width, height);
				break;

			case FOURCC_DXT5:
				decodedRgba = decodeDxt5(srcBytes, dataOffset, width, height);
				break;

			case FOURCC_ATI2:
			case FOURCC_BC5U:
				decodedRgba = decodeBc5(srcBytes, dataOffset, width, height);
				break;

			default: {
				const tag = String.fromCharCode(
					fourCC & 0xff,
					(fourCC >> 8) & 0xff,
					(fourCC >> 16) & 0xff,
					(fourCC >> 24) & 0xff,
				);
				throw new Error(
					`convertDds: Unsupported compression format FourCC: '${tag}'`,
				);
			}
		}
	} else if (pixelFormatFlags & (DDPF_RGB | DDPF_ALPHAPIXELS)) {
		if (rgbBitCount === 32 || rgbBitCount === 24) {
			decodedRgba = decodeUncompressedDds(
				srcBytes,
				dataOffset,
				width,
				height,
				rgbBitCount,
				rBitMask,
				bBitMask,
			);
		} else {
			throw new Error(
				`convertDds: Unsupported uncompressed bit depth: ${rgbBitCount} bpp`,
			);
		}
	} else {
		throw new Error(
			"convertDds: Unsupported or unknown DDS pixel format configuration",
		);
	}

	onProgress?.(0.7, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(width, height, decodedRgba);

	onProgress?.(1.0, "DONE");
	return pngBytes.buffer as ArrayBuffer;
}
