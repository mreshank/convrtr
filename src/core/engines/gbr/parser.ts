import { encodeRgbaToPng } from "../dds/parser";

export interface GbrMetadata {
	version: number;
	width: number;
	height: number;
	bytesPerPixel: number;
	spacing: number;
	name: string;
	pngBytes: Uint8Array;
}

/**
 * Parses a GIMP Brush (.gbr) file (supporting both version 1 and version 2)
 * and extracts a transparent, lossless PNG stamp.
 */
export function parseGbr(fileBytes: Uint8Array): GbrMetadata {
	if (fileBytes.length < 20) {
		throw new Error(
			"Invalid GIMP Brush (.gbr): File size is smaller than the minimum 20-byte header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const headerSize = view.getUint32(0, false);
	const version = view.getUint32(4, false);
	const width = view.getUint32(8, false);
	const height = view.getUint32(12, false);
	const bytesPerPixel = view.getUint32(16, false);

	if (version !== 1 && version !== 2) {
		throw new Error(
			`Unsupported GIMP Brush version: ${version}. Expected version 1 or 2.`,
		);
	}

	if (headerSize < 20 || headerSize > fileBytes.length) {
		throw new Error(
			`Invalid GBR header size: ${headerSize}. Corrupt or truncated file.`,
		);
	}

	if (width === 0 || height === 0 || width > 16384 || height > 16384) {
		throw new Error(
			`Invalid GBR brush dimensions: ${width}x${height}. Exceeds supported limits.`,
		);
	}

	if (bytesPerPixel !== 1 && bytesPerPixel !== 4) {
		throw new Error(
			`Unsupported GBR color depth: ${bytesPerPixel} bytes/pixel. Expected 1 (grayscale) or 4 (RGBA).`,
		);
	}

	let spacing = 25; // Default spacing percentage
	let name = "GIMP Brush";

	if (version === 2) {
		if (headerSize >= 28) {
			const magic = view.getUint32(20, false);
			// "GIMP" in ASCII is 0x47494D50
			if (magic !== 0x47494d50) {
				throw new Error(
					"Invalid GBR format: Missing 'GIMP' magic marker in version 2 header.",
				);
			}
			spacing = view.getUint32(24, false);

			if (headerSize > 28) {
				const nameBytes = fileBytes.subarray(28, headerSize);
				// Find null terminator if present
				let nullIdx = nameBytes.indexOf(0);
				if (nullIdx === -1) nullIdx = nameBytes.length;
				const decodedName = new TextDecoder("utf-8").decode(
					nameBytes.subarray(0, nullIdx),
				);
				if (decodedName.trim().length > 0) {
					name = decodedName.trim();
				}
			}
		}
	} else if (version === 1) {
		if (headerSize > 20) {
			const nameBytes = fileBytes.subarray(20, headerSize);
			let nullIdx = nameBytes.indexOf(0);
			if (nullIdx === -1) nullIdx = nameBytes.length;
			const decodedName = new TextDecoder("utf-8").decode(
				nameBytes.subarray(0, nullIdx),
			);
			if (decodedName.trim().length > 0) {
				name = decodedName.trim();
			}
		}
	}

	const totalPixels = width * height;
	const expectedDataLength = totalPixels * bytesPerPixel;
	const pixelDataOffset = headerSize;

	if (fileBytes.length < pixelDataOffset + expectedDataLength) {
		throw new Error(
			`Truncated GBR file: Expected ${expectedDataLength} pixel bytes, but only ${fileBytes.length - pixelDataOffset} bytes remaining.`,
		);
	}

	const rawPixels = fileBytes.subarray(
		pixelDataOffset,
		pixelDataOffset + expectedDataLength,
	);
	const rgba = new Uint8Array(totalPixels * 4);

	if (bytesPerPixel === 1) {
		// Grayscale brush stamp:
		// In GIMP, 0 is full opacity (black ink), 255 is white (transparent).
		// For standard digital painting PNG stamps (Photoshop / Procreate / Krita):
		// Ink is black (0, 0, 0) with alpha = 255 - V.
		for (let i = 0; i < totalPixels; i++) {
			const v = rawPixels[i] ?? 0;
			const alpha = 255 - v;
			const outOffset = i * 4;
			rgba[outOffset] = 0; // R
			rgba[outOffset + 1] = 0; // G
			rgba[outOffset + 2] = 0; // B
			rgba[outOffset + 3] = alpha; // A
		}
	} else {
		// bytesPerPixel === 4: Raw RGBA color brush
		rgba.set(rawPixels.subarray(0, totalPixels * 4));
	}

	const pngBytes = encodeRgbaToPng(width, height, rgba);

	return {
		version,
		width,
		height,
		bytesPerPixel,
		spacing,
		name,
		pngBytes,
	};
}

/**
 * Main conversion entry point for GIMP Brush (.gbr) to PNG conversion.
 */
export function convertGbrToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading GIMP Brush header & metadata...");
	const bytes = new Uint8Array(input);
	const parsed = parseGbr(bytes);

	onProgress?.(0.6, "Decoding brush opacity mask & rasterizing RGBA...");
	onProgress?.(0.9, "Encoding transparent PNG brush stamp...");

	onProgress?.(1.0, "Complete");
	return parsed.pngBytes.buffer.slice(
		parsed.pngBytes.byteOffset,
		parsed.pngBytes.byteOffset + parsed.pngBytes.byteLength,
	) as ArrayBuffer;
}
