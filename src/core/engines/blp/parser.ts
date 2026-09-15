import { decodeDxt1Block, decodeDxt5, encodeRgbaToPng } from "../dds/parser";
import type { BlpConversionOptions, BlpConversionResult } from "./types";

function decodeDxt1(
	src: Uint8Array,
	srcOffset: number,
	width: number,
	height: number,
	isAlpha: boolean,
): Uint8Array {
	const dst = new Uint8Array(width * height * 4);
	const blocksX = Math.ceil(width / 4);
	const blocksY = Math.ceil(height / 4);
	let offset = srcOffset;

	for (let by = 0; by < blocksY; by++) {
		for (let bx = 0; bx < blocksX; bx++) {
			if (offset + 8 <= src.length) {
				decodeDxt1Block(src, offset, dst, bx, by, width, height, isAlpha);
			}
			offset += 8;
		}
	}
	return dst;
}

/**
 * Parses Blizzard Texture (.blp) files (Warcraft III BLP1 and World of Warcraft BLP2)
 * into a transparent 32-bit RGBA PNG.
 */
export function convertBlpToPng(
	input: ArrayBuffer | Uint8Array,
	options: BlpConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): BlpConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 32) {
		throw new Error(
			"Invalid BLP file: Buffer too small for Blizzard Picture header.",
		);
	}

	const magic = String.fromCharCode(
		bytes[0] ?? 0,
		bytes[1] ?? 0,
		bytes[2] ?? 0,
		bytes[3] ?? 0,
	);

	if (magic !== "BLP1" && magic !== "BLP2") {
		throw new Error(
			"Invalid BLP file: Missing 'BLP1' or 'BLP2' format signature.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const version: "BLP1" | "BLP2" = magic;

	let type = 0;
	let compressionName = "";
	let width = 0;
	let height = 0;
	let alphaDepth = 0;
	let hasMipmaps = false;

	const mipOffsets: number[] = [];
	const mipLengths: number[] = [];
	let paletteOffset = 0;
	let compression = 0;
	let alphaEncoding = 0;

	if (version === "BLP1") {
		type = view.getUint32(4, true); // 0 = JPEG, 1 = Paletted/Direct
		alphaDepth = view.getUint32(8, true);
		width = view.getUint32(12, true);
		height = view.getUint32(16, true);
		const pictureSubType = view.getUint32(20, true);
		hasMipmaps = view.getUint32(24, true) > 0;

		compressionName =
			type === 0 ? "JPEG" : pictureSubType === 1 ? "Indexed" : "Direct";

		for (let i = 0; i < 16; i++) {
			mipOffsets.push(view.getUint32(28 + i * 4, true));
			mipLengths.push(view.getUint32(92 + i * 4, true));
		}
		paletteOffset = 156;
	} else {
		// BLP2
		type = view.getUint32(4, true); // 0 = JPEG, 1 = Direct
		compression = bytes[8] ?? 1; // 1 = Uncompressed/Paletted, 2 = DXT, 3 = Raw BGRA
		alphaDepth = bytes[9] ?? 0;
		alphaEncoding = bytes[10] ?? 0;
		hasMipmaps = (bytes[11] ?? 0) > 0;

		width = view.getUint32(12, true);
		height = view.getUint32(16, true);

		for (let i = 0; i < 16; i++) {
			mipOffsets.push(view.getUint32(20 + i * 4, true));
			mipLengths.push(view.getUint32(84 + i * 4, true));
		}
		paletteOffset = 148;

		if (compression === 1) compressionName = "Paletted";
		else if (compression === 2) {
			if (alphaEncoding === 7) compressionName = "DXT5";
			else if (alphaEncoding === 1) compressionName = "DXT3";
			else compressionName = "DXT1";
		} else if (compression === 3) compressionName = "Raw BGRA";
		else compressionName = `Compression-${compression}`;
	}

	if (width <= 0 || height <= 0 || width > 16384 || height > 16384) {
		throw new Error(
			`Invalid BLP dimensions: ${width}x${height} exceeds reasonable bounds.`,
		);
	}

	onProgress?.(0.3, "DECODE_PIXELS");

	const mipIdx = options.mipmapLevel ?? 0;
	const dataOffset = mipOffsets[mipIdx] || mipOffsets[0] || 0;
	let rgba: Uint8Array;

	if (version === "BLP1" && type === 1) {
		// BLP1 Paletted / Indexed
		const palette = bytes.subarray(paletteOffset, paletteOffset + 1024);
		const numPixels = width * height;
		const indicesOffset = dataOffset > 0 ? dataOffset : paletteOffset + 1024;
		const alphaOffset = indicesOffset + numPixels;

		rgba = new Uint8Array(numPixels * 4);

		for (let i = 0; i < numPixels; i++) {
			const pIdx = bytes[indicesOffset + i] ?? 0;
			const palEntry = pIdx * 4;

			// Palette entries are BGRA in BLP
			const b = palette[palEntry] ?? 0;
			const g = palette[palEntry + 1] ?? 0;
			const r = palette[palEntry + 2] ?? 0;

			let a = 255;
			if (alphaDepth === 8) {
				a = bytes[alphaOffset + i] ?? 255;
			} else if (alphaDepth === 4) {
				const byteVal = bytes[alphaOffset + Math.floor(i / 2)] ?? 0;
				const nibble = i % 2 === 0 ? byteVal & 0x0f : byteVal >> 4;
				a = nibble * 17;
			} else if (alphaDepth === 1) {
				const byteVal = bytes[alphaOffset + Math.floor(i / 8)] ?? 0;
				const bit = (byteVal >> (i % 8)) & 1;
				a = bit ? 255 : 0;
			}

			const outIdx = i * 4;
			rgba[outIdx] = r;
			rgba[outIdx + 1] = g;
			rgba[outIdx + 2] = b;
			rgba[outIdx + 3] = a;
		}
	} else if (version === "BLP2" && compression === 2) {
		// BLP2 DXT
		if (alphaEncoding === 7) {
			rgba = decodeDxt5(bytes, dataOffset, width, height);
		} else {
			const isAlpha = alphaDepth > 0;
			rgba = decodeDxt1(bytes, dataOffset, width, height, isAlpha);
		}
	} else if (version === "BLP2" && compression === 1) {
		// BLP2 Paletted
		const palette = bytes.subarray(paletteOffset, paletteOffset + 1024);
		const numPixels = width * height;
		const indicesOffset = dataOffset > 0 ? dataOffset : paletteOffset + 1024;
		const alphaOffset = indicesOffset + numPixels;

		rgba = new Uint8Array(numPixels * 4);

		for (let i = 0; i < numPixels; i++) {
			const pIdx = bytes[indicesOffset + i] ?? 0;
			const palEntry = pIdx * 4;

			const b = palette[palEntry] ?? 0;
			const g = palette[palEntry + 1] ?? 0;
			const r = palette[palEntry + 2] ?? 0;

			let a = 255;
			if (alphaDepth === 8) {
				a = bytes[alphaOffset + i] ?? 255;
			} else if (alphaDepth === 4) {
				const byteVal = bytes[alphaOffset + Math.floor(i / 2)] ?? 0;
				const nibble = i % 2 === 0 ? byteVal & 0x0f : byteVal >> 4;
				a = nibble * 17;
			} else if (alphaDepth === 1) {
				const byteVal = bytes[alphaOffset + Math.floor(i / 8)] ?? 0;
				const bit = (byteVal >> (i % 8)) & 1;
				a = bit ? 255 : 0;
			}

			const outIdx = i * 4;
			rgba[outIdx] = r;
			rgba[outIdx + 1] = g;
			rgba[outIdx + 2] = b;
			rgba[outIdx + 3] = a;
		}
	} else if (version === "BLP2" && compression === 3) {
		// BLP2 Raw BGRA
		const numPixels = width * height;
		rgba = new Uint8Array(numPixels * 4);
		for (let i = 0; i < numPixels; i++) {
			const inIdx = dataOffset + i * 4;
			const b = bytes[inIdx] ?? 0;
			const g = bytes[inIdx + 1] ?? 0;
			const r = bytes[inIdx + 2] ?? 0;
			const a = bytes[inIdx + 3] ?? 255;

			const outIdx = i * 4;
			rgba[outIdx] = r;
			rgba[outIdx + 1] = g;
			rgba[outIdx + 2] = b;
			rgba[outIdx + 3] = a;
		}
	} else {
		// Fallback for unhandled/raw variants: initialize transparent black
		rgba = new Uint8Array(width * height * 4);
	}

	onProgress?.(0.85, "ENCODE_PNG");

	const pngBytes = encodeRgbaToPng(width, height, rgba);

	onProgress?.(1.0, "COMPLETE");

	return {
		pngBuffer: pngBytes.buffer as ArrayBuffer,
		metadata: {
			version,
			type,
			compressionName,
			width,
			height,
			alphaDepth,
			hasMipmaps,
			pngBytes,
		},
	};
}
