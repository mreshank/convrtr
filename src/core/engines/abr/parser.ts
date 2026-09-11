import { zipSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

/**
 * Adobe Photoshop Brush (.abr) binary parser and stamp extractor.
 * Supports legacy ABR versions 1 & 2 as well as modern versions 6 & 10 (8BIM 'samp' blocks).
 * Decompresses PackBits RLE grayscale masks and synthesizes transparent PNG brush stamps.
 */

export interface ExtractedBrush {
	index: number;
	name: string;
	width: number;
	height: number;
	depth: number;
	pngData: Uint8Array;
}

export interface AbrExtractionResult {
	version: number;
	subversion: number;
	brushes: ExtractedBrush[];
	manifestMarkdown: string;
}

/**
 * Decompress Apple PackBits run-length encoded byte stream.
 */
export function decodePackBits(
	data: Uint8Array,
	dataOffset: number,
	maxReadLen: number,
	expectedSize: number,
): Uint8Array {
	const output = new Uint8Array(expectedSize);
	let inPos = 0;
	let outPos = 0;

	while (inPos < maxReadLen && outPos < expectedSize) {
		const raw = data[dataOffset + inPos];
		if (raw === undefined) break;
		inPos++;

		// Signed 8-bit integer
		const n = (raw << 24) >> 24;

		if (n === -128) {
			// NOP
			continue;
		}

		if (n < 0) {
			// Repeat next byte (-n + 1) times
			const count = -n + 1;
			const b = data[dataOffset + inPos] ?? 0;
			inPos++;
			const end = Math.min(outPos + count, expectedSize);
			for (let i = outPos; i < end; i++) {
				output[i] = b;
			}
			outPos += count;
		} else {
			// Verbatim copy (n + 1) bytes
			const count = n + 1;
			for (let i = 0; i < count && outPos < expectedSize; i++) {
				output[outPos++] = data[dataOffset + inPos++] ?? 0;
			}
		}
	}

	return output;
}

/**
 * Converts an 8-bit grayscale brush tip mask into a transparent RGBA PNG stamp.
 * Uses corner pixel sampling to automatically detect if canvas background is white or black.
 */
export function convertGrayscaleMaskToPng(
	grayscale: Uint8Array,
	width: number,
	height: number,
): Uint8Array {
	const totalPixels = width * height;
	const rgba = new Uint8Array(totalPixels * 4);

	if (totalPixels === 0) {
		return encodeRgbaToPng(Math.max(1, width), Math.max(1, height), rgba);
	}

	// Determine background color polarity by checking corners
	const c1 = grayscale[0] ?? 255;
	const c2 = grayscale[Math.max(0, width - 1)] ?? 255;
	const c3 = grayscale[Math.max(0, (height - 1) * width)] ?? 255;
	const c4 = grayscale[Math.max(0, totalPixels - 1)] ?? 255;
	const avgCorner = (c1 + c2 + c3 + c4) / 4;

	// In Photoshop, default canvas is white (255) and brush ink is dark (0).
	// If corners are white (> 128), opacity = 255 - pixelValue.
	// If corners are black (<= 128), opacity = pixelValue.
	const invertAlpha = avgCorner > 128;

	for (let i = 0; i < totalPixels; i++) {
		const sample = grayscale[i] ?? 0;
		const alpha = invertAlpha ? 255 - sample : sample;
		const offset = i * 4;
		// Black ink with alpha transparency
		rgba[offset] = 0; // R
		rgba[offset + 1] = 0; // G
		rgba[offset + 2] = 0; // B
		rgba[offset + 3] = alpha; // A
	}

	return encodeRgbaToPng(width, height, rgba);
}

/**
 * Parse an Adobe Photoshop Brush file (.abr) and extract all brush tips as PNG stamps.
 */
export function parseAbr(fileBytes: Uint8Array): AbrExtractionResult {
	if (fileBytes.length < 4) {
		throw new Error(
			"Invalid .abr file: File size is smaller than 4-byte header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);
	const version = view.getUint16(0, false);
	const subversion = view.getUint16(2, false);

	const isLegacy = version === 1 || version === 2;
	const isModern =
		(version === 6 || version === 10) && (subversion === 1 || subversion === 2);

	if (!isLegacy && !isModern) {
		throw new Error(
			`Unsupported ABR version ${version}.${subversion}. Expected version 1, 2, 6, or 10.`,
		);
	}

	const brushes: ExtractedBrush[] = [];

	if (isLegacy) {
		// Version 1 or 2: subversion field contains the brush count
		const brushCount = subversion;
		let offset = 4;

		for (let i = 0; i < brushCount && offset + 2 <= fileBytes.length; i++) {
			const brushLen = view.getUint16(offset, false);
			const nextBrushPos = offset + 2 + brushLen;
			let cur = offset + 2;

			if (cur + 2 > fileBytes.length) break;
			const brushType = view.getUint16(cur, false);
			cur += 2;

			// Type 2 is sampled image brush; type 1 is computed brush
			if (brushType === 2 && cur + 30 <= fileBytes.length) {
				// misc (4 bytes) + spacing (2 bytes)
				cur += 6;

				let brushName = `Brush_${String(i + 1).padStart(3, "0")}`;
				if (version === 2 && cur + 4 <= fileBytes.length) {
					const nameLen = view.getUint32(cur, false);
					cur += 4;
					if (nameLen > 0 && cur + nameLen * 2 <= fileBytes.length) {
						const chars: string[] = [];
						for (let c = 0; c < nameLen; c++) {
							const code = view.getUint16(cur + c * 2, false);
							if (code !== 0) chars.push(String.fromCharCode(code));
						}
						const parsed = chars.join("").trim();
						if (parsed.length > 0) brushName = parsed;
						cur += nameLen * 2;
					}
				}

				// antialiasing (1 byte)
				cur += 1;

				const top = view.getUint16(cur, false);
				const left = view.getUint16(cur + 2, false);
				const bottom = view.getUint16(cur + 4, false);
				const right = view.getUint16(cur + 6, false);
				cur += 8;

				// Skip 32-bit coordinates (_topl, _leftl, _bottoml, _rightl) = 16 bytes
				cur += 16;

				const depth = view.getUint16(cur, false);
				cur += 2;
				const compressed = (fileBytes[cur++] ?? 0) !== 0;

				const width = Math.max(0, right - left);
				const height = Math.max(0, bottom - top);
				const size = width * height * (depth >> 3);

				if (width > 0 && height > 0 && cur <= fileBytes.length) {
					let pixelData: Uint8Array;
					if (compressed) {
						let totalScanlineBytes = 0;
						for (
							let row = 0;
							row < height && cur + 2 <= fileBytes.length;
							row++
						) {
							totalScanlineBytes += view.getUint16(cur, false);
							cur += 2;
						}
						pixelData = decodePackBits(
							fileBytes,
							cur,
							totalScanlineBytes,
							size,
						);
					} else {
						pixelData = fileBytes.subarray(cur, cur + size);
					}

					const png = convertGrayscaleMaskToPng(pixelData, width, height);
					brushes.push({
						index: brushes.length + 1,
						name: brushName,
						width,
						height,
						depth,
						pngData: png,
					});
				}
			}

			offset = nextBrushPos;
		}
	} else {
		// Version 6 or 10: Tagged 8BIM blocks containing 'samp'
		let offset = 4;
		let sampOffset = -1;
		let sampLength = 0;

		while (offset + 12 <= fileBytes.length) {
			const sig = String.fromCharCode(
				fileBytes[offset] ?? 0,
				fileBytes[offset + 1] ?? 0,
				fileBytes[offset + 2] ?? 0,
				fileBytes[offset + 3] ?? 0,
			);
			offset += 4;

			if (sig !== "8BIM") {
				// Scan forward 1 byte if not aligned
				continue;
			}

			const key = String.fromCharCode(
				fileBytes[offset] ?? 0,
				fileBytes[offset + 1] ?? 0,
				fileBytes[offset + 2] ?? 0,
				fileBytes[offset + 3] ?? 0,
			);
			offset += 4;

			const blockLen = view.getUint32(offset, false);
			offset += 4;

			if (key === "samp") {
				sampOffset = offset;
				sampLength = blockLen;
				break;
			}

			offset += blockLen;
		}

		if (sampOffset !== -1) {
			const sampEnd = Math.min(fileBytes.length, sampOffset + sampLength);
			let cur = sampOffset;

			while (cur + 8 < sampEnd) {
				const brushLen = view.getUint32(cur, false);
				const nextBrushPos = ((cur + 4 + brushLen + 3) & ~3) >>> 0;

				const skipAmt = subversion === 1 ? 47 : 301;
				let bodyPos = cur + 4 + skipAmt;

				if (bodyPos + 19 <= sampEnd && bodyPos + 19 <= nextBrushPos) {
					const top = view.getUint32(bodyPos, false);
					const left = view.getUint32(bodyPos + 4, false);
					const bottom = view.getUint32(bodyPos + 8, false);
					const right = view.getUint32(bodyPos + 12, false);
					const depth = view.getUint16(bodyPos + 16, false);
					const compressed = (fileBytes[bodyPos + 18] ?? 0) !== 0;
					bodyPos += 19;

					const width = Math.max(0, right - left);
					const height = Math.max(0, bottom - top);
					const size = width * height * (depth >> 3);

					if (width > 0 && height > 0 && width <= 16384 && height <= 16384) {
						let pixelData: Uint8Array;
						if (compressed) {
							let totalScanlineBytes = 0;
							for (let row = 0; row < height && bodyPos + 2 <= sampEnd; row++) {
								totalScanlineBytes += view.getUint16(bodyPos, false);
								bodyPos += 2;
							}
							pixelData = decodePackBits(
								fileBytes,
								bodyPos,
								totalScanlineBytes,
								size,
							);
						} else {
							pixelData = fileBytes.subarray(bodyPos, bodyPos + size);
						}

						const brushIndex = brushes.length + 1;
						const brushName = `Brush_${String(brushIndex).padStart(3, "0")}_${width}x${height}`;
						const png = convertGrayscaleMaskToPng(pixelData, width, height);

						brushes.push({
							index: brushIndex,
							name: brushName,
							width,
							height,
							depth,
							pngData: png,
						});
					}
				}

				cur = Math.max(cur + 4, nextBrushPos);
			}
		}
	}

	// Build markdown manifest summary
	const lines = [
		"# Adobe Photoshop Brush (.abr) Extraction Report",
		"",
		`- **Format Version**: ${version}.${subversion} (${isLegacy ? "Legacy Photoshop 1–6 Format" : "Modern CS2+ 8BIM Format"})`,
		`- **Total Brush Tips Extracted**: ${brushes.length}`,
		"",
		"## Extracted Brush Stamps",
		"",
		"| # | Name | Dimensions | Bit Depth | Output File |",
		"|---|---|---|---|---|",
	];

	for (const b of brushes) {
		lines.push(
			`| ${b.index} | \`${b.name}\` | ${b.width} × ${b.height} px | ${b.depth}-bit | \`${b.name}.png\` |`,
		);
	}

	lines.push(
		"",
		"## How to Import into Other Painting Software",
		"",
		"- **Procreate**: Create a new brush -> **Shape Source** -> **Import** -> Select any `.png` stamp from this archive.",
		"- **Krita**: Open Brush Settings -> **Stamp** -> **Add Predefined Brush** -> Choose the extracted `.png` file.",
		"- **Clip Studio Paint**: Register material as brush tip image -> Check **Use for brush tip shape**.",
		"- **Figma / Web**: Drag and drop the `.png` files directly into your designs as transparent raster decals or mask shapes.",
		"",
		"---",
		"*Extracted 100% locally in your browser with zero server uploads.*",
	);

	return {
		version,
		subversion,
		brushes,
		manifestMarkdown: lines.join("\n"),
	};
}

/**
 * Converts an Adobe Photoshop Brush library (.abr) into a ZIP archive containing
 * all transparent PNG brush stamps along with a detailed BRUSH_MANIFEST.md.
 */
export function convertAbrToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_ABR");
	const result = parseAbr(new Uint8Array(input));

	if (result.brushes.length === 0) {
		throw new Error(
			"No sampled brush stamps found in this .abr file. The file may only contain computed vector dynamics or empty presets.",
		);
	}

	onProgress?.(0.5, "EXTRACTING_STAMPS");
	const zipFiles: Record<string, Uint8Array> = {};

	for (const brush of result.brushes) {
		const safeName = brush.name.replace(/[^a-zA-Z0-9_-]/g, "_");
		zipFiles[`${safeName}.png`] = brush.pngData;
	}

	onProgress?.(0.8, "BUILD_MANIFEST");
	zipFiles["BRUSH_MANIFEST.md"] = new TextEncoder().encode(
		result.manifestMarkdown,
	);

	onProgress?.(0.9, "COMPRESS_ZIP");
	const zipped = zipSync(zipFiles);

	onProgress?.(1.0, "DONE");
	return zipped.buffer as ArrayBuffer;
}
