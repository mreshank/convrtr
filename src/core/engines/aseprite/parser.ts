import { inflateSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

export interface AsepriteMetadata {
	width: number;
	height: number;
	frames: number;
	colorDepth: number;
	colorDepthName: string;
	pngBytes: Uint8Array;
}

export interface AseColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Parses an Aseprite (.aseprite / .ase) pixel art file and renders the composite image into PNG.
 * Supports 32-bit RGBA, 16-bit Grayscale, and 8-bit Indexed palettes with zlib-compressed cel chunks.
 */
export function parseAseprite(fileBytes: Uint8Array): AsepriteMetadata {
	if (fileBytes.length < 128) {
		throw new Error(
			"Invalid Aseprite file: File size is smaller than the 128-byte header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const magic = view.getUint16(4, true);
	if (magic !== 0xa5e0) {
		throw new Error(
			`Invalid Aseprite signature: Expected 0xA5E0, received 0x${magic.toString(16).toUpperCase()}.`,
		);
	}

	const frames = view.getUint16(6, true);
	const width = view.getUint16(8, true);
	const height = view.getUint16(10, true);
	const colorDepth = view.getUint16(12, true);
	const transparentIndex = fileBytes[28] ?? 0;

	if (width === 0 || height === 0 || width > 16384 || height > 16384) {
		throw new Error(`Invalid Aseprite canvas dimensions: ${width}x${height}.`);
	}

	let depthName = "Unknown";
	if (colorDepth === 32) depthName = "32-bit RGBA";
	else if (colorDepth === 16) depthName = "16-bit Grayscale";
	else if (colorDepth === 8) depthName = "8-bit Indexed";
	else {
		throw new Error(`Unsupported Aseprite color depth: ${colorDepth} bpp.`);
	}

	// Default 256-color palette
	const palette: AseColor[] = new Array(256);
	for (let i = 0; i < 256; i++) {
		palette[i] = { r: i, g: i, b: i, a: 255 };
	}

	// Canvas buffer (32-bit RGBA initialized to transparent)
	const canvas = new Uint8Array(width * height * 4);

	let offset = 128;

	// Parse first frame (or all frames) to composite visual preview
	for (let f = 0; f < frames && offset < fileBytes.length; f++) {
		if (offset + 16 > fileBytes.length) break;

		const frameBytes = view.getUint32(offset, true);
		const frameMagic = view.getUint16(offset + 4, true);

		if (frameMagic !== 0xf1fa) {
			throw new Error(
				`Invalid Aseprite frame header magic at offset ${offset}. Expected 0xF1FA.`,
			);
		}

		let chunkCount = view.getUint16(offset + 6, true);
		const chunkCountNew = view.getUint32(offset + 12, true);
		if (chunkCount === 0xffff && chunkCountNew > 0) {
			chunkCount = chunkCountNew;
		}

		let chunkOffset = offset + 16;
		const frameEnd = offset + frameBytes;

		for (let c = 0; c < chunkCount && chunkOffset < frameEnd; c++) {
			if (chunkOffset + 6 > fileBytes.length) break;

			const chunkSize = view.getUint32(chunkOffset, true);
			const chunkType = view.getUint16(chunkOffset + 4, true);
			const dataStart = chunkOffset + 6;

			// Chunk 0x2019: Palette Chunk
			if (chunkType === 0x2019) {
				const firstIdx = view.getUint32(dataStart + 4, true);
				const lastIdx = view.getUint32(dataStart + 8, true);
				let colorOffset = dataStart + 20;

				for (
					let p = firstIdx;
					p <= lastIdx && colorOffset < chunkOffset + chunkSize;
					p++
				) {
					const hasName = view.getUint16(colorOffset, true) & 1;
					const r = fileBytes[colorOffset + 2] ?? 0;
					const g = fileBytes[colorOffset + 3] ?? 0;
					const b = fileBytes[colorOffset + 4] ?? 0;
					const a = fileBytes[colorOffset + 5] ?? 255;

					if (p < 256) {
						palette[p] = { r, g, b, a };
					}

					colorOffset += 6;
					if (hasName) {
						const nameLen = view.getUint16(colorOffset, true);
						colorOffset += 2 + nameLen;
					}
				}
			}

			// Chunk 0x2005: Cel Chunk
			if (chunkType === 0x2005 && f === 0) {
				const celX = view.getInt16(dataStart + 2, true);
				const celY = view.getInt16(dataStart + 4, true);
				const opacity = fileBytes[dataStart + 6] ?? 255;
				const celType = view.getUint16(dataStart + 7, true);

				// Type 0: Raw cel, Type 2: Compressed image
				if (celType === 0 || celType === 2) {
					const celW = view.getUint16(dataStart + 16, true);
					const celH = view.getUint16(dataStart + 18, true);

					let decompressedPixels: Uint8Array | null = null;

					if (celType === 2) {
						const compressedData = fileBytes.subarray(
							dataStart + 20,
							chunkOffset + chunkSize,
						);
						try {
							decompressedPixels = inflateSync(compressedData);
						} catch {
							decompressedPixels = null;
						}
					} else {
						decompressedPixels = fileBytes.subarray(
							dataStart + 20,
							chunkOffset + chunkSize,
						);
					}

					if (decompressedPixels) {
						// Blend cel into canvas
						for (let cy = 0; cy < celH; cy++) {
							const dstY = celY + cy;
							if (dstY < 0 || dstY >= height) continue;

							for (let cx = 0; cx < celW; cx++) {
								const dstX = celX + cx;
								if (dstX < 0 || dstX >= width) continue;

								let r = 0;
								let g = 0;
								let b = 0;
								let a = 0;

								if (colorDepth === 32) {
									const srcIdx = (cy * celW + cx) * 4;
									r = decompressedPixels[srcIdx] ?? 0;
									g = decompressedPixels[srcIdx + 1] ?? 0;
									b = decompressedPixels[srcIdx + 2] ?? 0;
									a = Math.round(
										((decompressedPixels[srcIdx + 3] ?? 255) * opacity) / 255,
									);
								} else if (colorDepth === 16) {
									const srcIdx = (cy * celW + cx) * 2;
									const val = decompressedPixels[srcIdx] ?? 0;
									const alpha = decompressedPixels[srcIdx + 1] ?? 255;
									r = val;
									g = val;
									b = val;
									a = Math.round((alpha * opacity) / 255);
								} else if (colorDepth === 8) {
									const srcIdx = cy * celW + cx;
									const palIdx = decompressedPixels[srcIdx] ?? 0;
									if (palIdx !== transparentIndex) {
										const palColor = palette[palIdx] ?? {
											r: 0,
											g: 0,
											b: 0,
											a: 255,
										};
										r = palColor.r;
										g = palColor.g;
										b = palColor.b;
										a = Math.round((palColor.a * opacity) / 255);
									}
								}

								if (a > 0) {
									const dstIdx = (dstY * width + dstX) * 4;
									const bgR = canvas[dstIdx] ?? 0;
									const bgG = canvas[dstIdx + 1] ?? 0;
									const bgB = canvas[dstIdx + 2] ?? 0;
									const bgA = canvas[dstIdx + 3] ?? 0;

									if (bgA === 0 || a === 255) {
										canvas[dstIdx] = r;
										canvas[dstIdx + 1] = g;
										canvas[dstIdx + 2] = b;
										canvas[dstIdx + 3] = a;
									} else {
										// Alpha compositing
										const alphaNorm = a / 255;
										const bgAlphaNorm = (bgA / 255) * (1 - alphaNorm);
										const outAlpha = alphaNorm + bgAlphaNorm;

										if (outAlpha > 0) {
											canvas[dstIdx] = Math.round(
												(r * alphaNorm + bgR * bgAlphaNorm) / outAlpha,
											);
											canvas[dstIdx + 1] = Math.round(
												(g * alphaNorm + bgG * bgAlphaNorm) / outAlpha,
											);
											canvas[dstIdx + 2] = Math.round(
												(b * alphaNorm + bgB * bgAlphaNorm) / outAlpha,
											);
											canvas[dstIdx + 3] = Math.round(outAlpha * 255);
										}
									}
								}
							}
						}
					}
				}
			}

			chunkOffset += chunkSize;
		}

		offset = frameEnd;
	}

	const pngBytes = encodeRgbaToPng(width, height, canvas);

	return {
		width,
		height,
		frames,
		colorDepth,
		colorDepthName: depthName,
		pngBytes,
	};
}

/**
 * High-level engine runner for converting Aseprite pixel art files to PNG.
 */
export function convertAsepriteToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Aseprite header");
	const bytes = new Uint8Array(input);
	onProgress?.(0.4, "Decompressing cels and compositing layers");
	const metadata = parseAseprite(bytes);
	onProgress?.(0.9, "Encoding PNG image");
	return metadata.pngBytes.buffer.slice(
		metadata.pngBytes.byteOffset,
		metadata.pngBytes.byteOffset + metadata.pngBytes.byteLength,
	) as ArrayBuffer;
}
