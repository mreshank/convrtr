import { decodeDxt1Block, decodeDxt5, encodeRgbaToPng } from "../dds/parser";

export interface VtfMetadata {
	width: number;
	height: number;
	majorVersion: number;
	minorVersion: number;
	format: number;
	formatName: string;
	mipmapCount: number;
	frames: number;
	pngBytes: Uint8Array;
}

export const VTF_FORMAT_NAMES: Record<number, string> = {
	0: "RGBA8888",
	1: "ABGR8888",
	2: "RGB888",
	3: "BGR888",
	5: "I8 (Grayscale)",
	11: "IA88",
	12: "BGRA8888",
	13: "DXT1 (BC1)",
	14: "DXT3 (BC2)",
	15: "DXT5 (BC3)",
	19: "UV88",
};

/**
 * Calculates byte size of a 2D image for given format and dimensions.
 */
function getMipmapSize(format: number, width: number, height: number): number {
	switch (format) {
		case 13: // DXT1
			return (
				Math.max(1, Math.ceil(width / 4)) *
				Math.max(1, Math.ceil(height / 4)) *
				8
			);
		case 14: // DXT3
		case 15: // DXT5
			return (
				Math.max(1, Math.ceil(width / 4)) *
				Math.max(1, Math.ceil(height / 4)) *
				16
			);
		case 0: // RGBA8888
		case 1: // ABGR8888
		case 12: // BGRA8888
			return width * height * 4;
		case 2: // RGB888
		case 3: // BGR888
			return width * height * 3;
		case 5: // I8
			return width * height;
		case 11: // IA88
		case 19: // UV88
			return width * height * 2;
		default:
			return width * height * 4;
	}
}

/**
 * Decodes Valve Texture Format (.vtf) game textures (Source Engine / TF2 / CS:GO / Garry's Mod)
 * into a transparent 32-bit RGBA PNG.
 */
export function parseVtf(fileBytes: Uint8Array): VtfMetadata {
	if (fileBytes.length < 64) {
		throw new Error(
			"Invalid VTF file: File size is smaller than the 64-byte minimum VTF header.",
		);
	}

	// Signature: "VTF\0" (0x56, 0x54, 0x46, 0x00)
	if (
		fileBytes[0] !== 0x56 ||
		fileBytes[1] !== 0x54 ||
		fileBytes[2] !== 0x46 ||
		fileBytes[3] !== 0x00
	) {
		throw new Error(
			"Invalid VTF signature: Expected 'VTF\\0' magic marker at byte 0.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const majorVersion = view.getUint32(4, true);
	const minorVersion = view.getUint32(8, true);
	const headerSize = view.getUint32(12, true);

	if (majorVersion !== 7) {
		throw new Error(
			`Unsupported VTF version: ${majorVersion}.${minorVersion}. Only VTF version 7.x is supported.`,
		);
	}

	const width = view.getUint16(16, true);
	const height = view.getUint16(18, true);

	if (width === 0 || height === 0 || width > 16384 || height > 16384) {
		throw new Error(
			`Invalid VTF texture dimensions: ${width}x${height}. Dimensions out of valid range.`,
		);
	}

	const frames = view.getUint16(24, true) || 1;
	const highResImageFormat = view.getUint32(52, true);
	const mipmapCount = Math.max(1, fileBytes[56] ?? 1);

	const lowResImageFormat = view.getInt32(57, true);
	const lowResImageWidth = fileBytes[61] ?? 0;
	const lowResImageHeight = fileBytes[62] ?? 0;

	// Calculate offset past header and low-res thumbnail
	let dataOffset = headerSize;

	if (
		lowResImageFormat !== -1 &&
		lowResImageWidth > 0 &&
		lowResImageHeight > 0
	) {
		const lowResSize = getMipmapSize(
			lowResImageFormat,
			lowResImageWidth,
			lowResImageHeight,
		);
		dataOffset += lowResSize;
	}

	// In VTF, mipmaps are stored from SMALLEST (mipmapCount - 1) to LARGEST (0).
	// We want Mip 0 (full resolution width x height).
	// Skip all preceding smaller mipmaps (mipmapCount - 1 down to 1).
	for (let m = mipmapCount - 1; m > 0; m--) {
		const mw = Math.max(1, Math.floor(width / (1 << m)));
		const mh = Math.max(1, Math.floor(height / (1 << m)));
		const mSize = getMipmapSize(highResImageFormat, mw, mh);
		dataOffset += mSize;
	}

	if (dataOffset >= fileBytes.length) {
		throw new Error(
			`Corrupt VTF texture: Computed data offset (${dataOffset}) exceeds file size (${fileBytes.length}).`,
		);
	}

	let decodedRgba: Uint8Array;

	switch (highResImageFormat) {
		case 13: {
			// DXT1 (BC1)
			decodedRgba = new Uint8Array(width * height * 4);
			const blocksX = Math.ceil(width / 4);
			const blocksY = Math.ceil(height / 4);
			let blockOffset = dataOffset;

			for (let by = 0; by < blocksY; by++) {
				for (let bx = 0; bx < blocksX; bx++) {
					decodeDxt1Block(
						fileBytes,
						blockOffset,
						decodedRgba,
						bx,
						by,
						width,
						height,
						true,
					);
					blockOffset += 8;
				}
			}
			break;
		}

		case 15: {
			// DXT5 (BC3)
			decodedRgba = decodeDxt5(fileBytes, dataOffset, width, height);
			break;
		}

		case 0: {
			// RGBA8888
			decodedRgba = new Uint8Array(width * height * 4);
			decodedRgba.set(
				fileBytes.subarray(dataOffset, dataOffset + width * height * 4),
			);
			break;
		}

		case 1: {
			// ABGR8888 -> RGBA8888
			decodedRgba = new Uint8Array(width * height * 4);
			for (let i = 0; i < width * height; i++) {
				const a = fileBytes[dataOffset + i * 4] ?? 255;
				const b = fileBytes[dataOffset + i * 4 + 1] ?? 0;
				const g = fileBytes[dataOffset + i * 4 + 2] ?? 0;
				const r = fileBytes[dataOffset + i * 4 + 3] ?? 0;
				decodedRgba[i * 4] = r;
				decodedRgba[i * 4 + 1] = g;
				decodedRgba[i * 4 + 2] = b;
				decodedRgba[i * 4 + 3] = a;
			}
			break;
		}

		case 12: {
			// BGRA8888 -> RGBA8888
			decodedRgba = new Uint8Array(width * height * 4);
			for (let i = 0; i < width * height; i++) {
				const b = fileBytes[dataOffset + i * 4] ?? 0;
				const g = fileBytes[dataOffset + i * 4 + 1] ?? 0;
				const r = fileBytes[dataOffset + i * 4 + 2] ?? 0;
				const a = fileBytes[dataOffset + i * 4 + 3] ?? 255;
				decodedRgba[i * 4] = r;
				decodedRgba[i * 4 + 1] = g;
				decodedRgba[i * 4 + 2] = b;
				decodedRgba[i * 4 + 3] = a;
			}
			break;
		}

		case 2: {
			// RGB888 -> RGBA8888
			decodedRgba = new Uint8Array(width * height * 4);
			for (let i = 0; i < width * height; i++) {
				decodedRgba[i * 4] = fileBytes[dataOffset + i * 3] ?? 0;
				decodedRgba[i * 4 + 1] = fileBytes[dataOffset + i * 3 + 1] ?? 0;
				decodedRgba[i * 4 + 2] = fileBytes[dataOffset + i * 3 + 2] ?? 0;
				decodedRgba[i * 4 + 3] = 255;
			}
			break;
		}

		case 3: {
			// BGR888 -> RGBA8888
			decodedRgba = new Uint8Array(width * height * 4);
			for (let i = 0; i < width * height; i++) {
				decodedRgba[i * 4] = fileBytes[dataOffset + i * 3 + 2] ?? 0;
				decodedRgba[i * 4 + 1] = fileBytes[dataOffset + i * 3 + 1] ?? 0;
				decodedRgba[i * 4 + 2] = fileBytes[dataOffset + i * 3] ?? 0;
				decodedRgba[i * 4 + 3] = 255;
			}
			break;
		}

		case 5: {
			// I8 (Grayscale)
			decodedRgba = new Uint8Array(width * height * 4);
			for (let i = 0; i < width * height; i++) {
				const v = fileBytes[dataOffset + i] ?? 0;
				decodedRgba[i * 4] = v;
				decodedRgba[i * 4 + 1] = v;
				decodedRgba[i * 4 + 2] = v;
				decodedRgba[i * 4 + 3] = 255;
			}
			break;
		}

		default:
			throw new Error(
				`Unsupported VTF format code: ${highResImageFormat} (${VTF_FORMAT_NAMES[highResImageFormat] || "Unknown"}).`,
			);
	}

	const pngBytes = encodeRgbaToPng(width, height, decodedRgba);

	return {
		width,
		height,
		majorVersion,
		minorVersion,
		format: highResImageFormat,
		formatName: VTF_FORMAT_NAMES[highResImageFormat] || "Unknown",
		mipmapCount,
		frames,
		pngBytes,
	};
}

/**
 * High-level engine runner for converting VTF textures to PNG.
 */
export function convertVtfToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading VTF header");
	const bytes = new Uint8Array(input);
	onProgress?.(0.5, "Decompressing texture blocks");
	const metadata = parseVtf(bytes);
	onProgress?.(0.9, "Encoding PNG image");
	return metadata.pngBytes.buffer.slice(
		metadata.pngBytes.byteOffset,
		metadata.pngBytes.byteOffset + metadata.pngBytes.byteLength,
	) as ArrayBuffer;
}
