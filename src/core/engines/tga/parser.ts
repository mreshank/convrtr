import { encodeRgbaToPng } from "../dds/parser";

export interface TgaMetadata {
	width: number;
	height: number;
	pixelDepth: number;
	imageType: number;
	imageTypeName: string;
	hasAlpha: boolean;
	isRle: boolean;
	idString?: string;
	pngBytes: Uint8Array;
}

const IMAGE_TYPE_NAMES: Record<number, string> = {
	0: "No Image Data",
	1: "Uncompressed Color-Mapped",
	2: "Uncompressed Truecolor",
	3: "Uncompressed Grayscale",
	9: "RLE Color-Mapped",
	10: "RLE Truecolor",
	11: "RLE Grayscale",
};

/**
 * Decodes Truevision TGA (.tga / .icb / .vda / .vst) images and renders a lossless 32-bit RGBA PNG.
 * Handles uncompressed & RLE compression, 8/15/16/24/32 bpp, grayscale, paletted color-maps,
 * and bottom-up vs top-down vertical orientations.
 */
export function parseTga(fileBytes: Uint8Array): TgaMetadata {
	if (fileBytes.length < 18) {
		throw new Error(
			"Invalid TGA image: File size is smaller than the 18-byte TGA header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const idLength = fileBytes[0] ?? 0;
	const colorMapType = fileBytes[1] ?? 0;
	const imageType = fileBytes[2] ?? 0;

	const colorMapStart = view.getUint16(3, true);
	const colorMapLength = view.getUint16(5, true);
	const colorMapDepth = fileBytes[7] ?? 0;

	const width = view.getUint16(12, true);
	const height = view.getUint16(14, true);
	const pixelDepth = fileBytes[16] ?? 0;
	const imageDescriptor = fileBytes[17] ?? 0;

	if (width === 0 || height === 0) {
		throw new Error(
			`Invalid TGA image dimensions: ${width}x${height}. Width and height must be greater than zero.`,
		);
	}

	const imageTypeName = IMAGE_TYPE_NAMES[imageType] ?? `Unknown (${imageType})`;
	if (
		imageType !== 1 &&
		imageType !== 2 &&
		imageType !== 3 &&
		imageType !== 9 &&
		imageType !== 10 &&
		imageType !== 11
	) {
		throw new Error(
			`Unsupported TGA image type: ${imageType} (${imageTypeName}). Supported types: 1, 2, 3, 9, 10, 11.`,
		);
	}

	let offset = 18;

	// Optional Image ID string
	let idString: string | undefined;
	if (idLength > 0) {
		if (offset + idLength > fileBytes.length) {
			throw new Error("Unexpected end of file while reading TGA image ID.");
		}
		idString = new TextDecoder("utf-8").decode(
			fileBytes.subarray(offset, offset + idLength),
		);
		offset += idLength;
	}

	// Color Map (Palette)
	const palette: Array<[number, number, number, number]> = [];
	if (colorMapType === 1 && colorMapLength > 0) {
		const bytesPerEntry = Math.ceil(colorMapDepth / 8);
		const paletteBytesTotal = colorMapLength * bytesPerEntry;
		if (offset + paletteBytesTotal > fileBytes.length) {
			throw new Error(
				"Unexpected end of file while reading TGA color map palette.",
			);
		}

		for (let i = 0; i < colorMapLength; i++) {
			const entryOffset = offset + i * bytesPerEntry;
			if (colorMapDepth === 24) {
				const b = fileBytes[entryOffset] ?? 0;
				const g = fileBytes[entryOffset + 1] ?? 0;
				const r = fileBytes[entryOffset + 2] ?? 0;
				palette.push([r, g, b, 255]);
			} else if (colorMapDepth === 32) {
				const b = fileBytes[entryOffset] ?? 0;
				const g = fileBytes[entryOffset + 1] ?? 0;
				const r = fileBytes[entryOffset + 2] ?? 0;
				const a = fileBytes[entryOffset + 3] ?? 255;
				palette.push([r, g, b, a]);
			} else if (colorMapDepth === 15 || colorMapDepth === 16) {
				const val = view.getUint16(entryOffset, true);
				const r = Math.round((((val >> 10) & 0x1f) * 255) / 31);
				const g = Math.round((((val >> 5) & 0x1f) * 255) / 31);
				const b = Math.round(((val & 0x1f) * 255) / 31);
				const a = colorMapDepth === 16 && (val & 0x8000) === 0 ? 0 : 255;
				palette.push([r, g, b, a]);
			}
		}
		offset += paletteBytesTotal;
	}

	const isRle = imageType === 9 || imageType === 10 || imageType === 11;
	const isColorMapped = imageType === 1 || imageType === 9;
	const isGrayscale = imageType === 3 || imageType === 11;
	const isTruecolor = imageType === 2 || imageType === 10;

	const bytesPerPixel = Math.max(1, Math.ceil(pixelDepth / 8));
	const totalPixels = width * height;

	// Temporary buffer to hold decoded sequential pixels [R, G, B, A]
	const decodedPixels = new Uint8Array(totalPixels * 4);
	let pixelsDecoded = 0;

	const decodePixel = (srcOffset: number): [number, number, number, number] => {
		if (isColorMapped) {
			let index = 0;
			if (bytesPerPixel === 1) {
				index = fileBytes[srcOffset] ?? 0;
			} else if (bytesPerPixel === 2) {
				index = view.getUint16(srcOffset, true);
			}
			const actualIndex = index - colorMapStart;
			const entry = palette[actualIndex];
			if (!entry) {
				return [0, 0, 0, 255];
			}
			return entry;
		}

		if (isGrayscale) {
			const gray = fileBytes[srcOffset] ?? 0;
			const alpha = pixelDepth === 16 ? (fileBytes[srcOffset + 1] ?? 255) : 255;
			return [gray, gray, gray, alpha];
		}

		if (isTruecolor) {
			if (pixelDepth === 24) {
				const b = fileBytes[srcOffset] ?? 0;
				const g = fileBytes[srcOffset + 1] ?? 0;
				const r = fileBytes[srcOffset + 2] ?? 0;
				return [r, g, b, 255];
			}
			if (pixelDepth === 32) {
				const b = fileBytes[srcOffset] ?? 0;
				const g = fileBytes[srcOffset + 1] ?? 0;
				const r = fileBytes[srcOffset + 2] ?? 0;
				const a = fileBytes[srcOffset + 3] ?? 255;
				return [r, g, b, a];
			}
			if (pixelDepth === 15 || pixelDepth === 16) {
				const val = view.getUint16(srcOffset, true);
				const r = Math.round((((val >> 10) & 0x1f) * 255) / 31);
				const g = Math.round((((val >> 5) & 0x1f) * 255) / 31);
				const b = Math.round(((val & 0x1f) * 255) / 31);
				const a = pixelDepth === 16 && (val & 0x8000) === 0 ? 0 : 255;
				return [r, g, b, a];
			}
		}

		return [0, 0, 0, 255];
	};

	if (isRle) {
		while (pixelsDecoded < totalPixels && offset < fileBytes.length) {
			const packetHeader = fileBytes[offset++] ?? 0;
			const count = (packetHeader & 0x7f) + 1;
			const isRunLength = (packetHeader & 0x80) !== 0;

			if (isRunLength) {
				if (offset + bytesPerPixel > fileBytes.length) {
					break;
				}
				const [r, g, b, a] = decodePixel(offset);
				offset += bytesPerPixel;
				for (let i = 0; i < count && pixelsDecoded < totalPixels; i++) {
					const dest = pixelsDecoded * 4;
					decodedPixels[dest] = r;
					decodedPixels[dest + 1] = g;
					decodedPixels[dest + 2] = b;
					decodedPixels[dest + 3] = a;
					pixelsDecoded++;
				}
			} else {
				// Raw packet
				for (let i = 0; i < count && pixelsDecoded < totalPixels; i++) {
					if (offset + bytesPerPixel > fileBytes.length) {
						break;
					}
					const [r, g, b, a] = decodePixel(offset);
					offset += bytesPerPixel;
					const dest = pixelsDecoded * 4;
					decodedPixels[dest] = r;
					decodedPixels[dest + 1] = g;
					decodedPixels[dest + 2] = b;
					decodedPixels[dest + 3] = a;
					pixelsDecoded++;
				}
			}
		}
	} else {
		// Uncompressed
		for (let i = 0; i < totalPixels && offset < fileBytes.length; i++) {
			const [r, g, b, a] = decodePixel(offset);
			offset += bytesPerPixel;
			const dest = i * 4;
			decodedPixels[dest] = r;
			decodedPixels[dest + 1] = g;
			decodedPixels[dest + 2] = b;
			decodedPixels[dest + 3] = a;
			pixelsDecoded++;
		}
	}

	// Orientation handling:
	// Bit 5: 0 = Bottom-to-top (traditional TGA), 1 = Top-to-bottom
	// Bit 4: 0 = Left-to-right, 1 = Right-to-left
	const isTopDown = (imageDescriptor & 0x20) !== 0;
	const isRightToLeft = (imageDescriptor & 0x10) !== 0;

	const outputRgba = new Uint8Array(width * height * 4);
	let hasAlpha = false;

	for (let row = 0; row < height; row++) {
		const targetY = isTopDown ? row : height - 1 - row;
		for (let col = 0; col < width; col++) {
			const targetX = isRightToLeft ? width - 1 - col : col;
			const srcIndex = (row * width + col) * 4;
			const targetIndex = (targetY * width + targetX) * 4;

			const r = decodedPixels[srcIndex] ?? 0;
			const g = decodedPixels[srcIndex + 1] ?? 0;
			const b = decodedPixels[srcIndex + 2] ?? 0;
			const a = decodedPixels[srcIndex + 3] ?? 255;

			if (a < 255) {
				hasAlpha = true;
			}

			outputRgba[targetIndex] = r;
			outputRgba[targetIndex + 1] = g;
			outputRgba[targetIndex + 2] = b;
			outputRgba[targetIndex + 3] = a;
		}
	}

	const pngBytes = encodeRgbaToPng(width, height, outputRgba);

	return {
		width,
		height,
		pixelDepth,
		imageType,
		imageTypeName,
		hasAlpha,
		isRle,
		idString,
		pngBytes,
	};
}

/**
 * Main conversion entry point for Truevision TGA to PNG conversion.
 */
export function convertTgaToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading TGA header & color-map...");
	const bytes = new Uint8Array(input);
	const parsed = parseTga(bytes);

	onProgress?.(0.6, "Decoding pixels & adjusting scanline orientation...");
	onProgress?.(0.9, "Compressing lossless PNG image...");

	onProgress?.(1.0, "Complete");
	return parsed.pngBytes.buffer.slice(
		parsed.pngBytes.byteOffset,
		parsed.pngBytes.byteOffset + parsed.pngBytes.byteLength,
	) as ArrayBuffer;
}
