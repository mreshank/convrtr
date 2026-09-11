import { encodeRgbaToPng } from "../dds/parser";
import type {
	TimColorMode,
	TimConversionResult,
	TimImageMetadata,
	TimToPngOptions,
} from "./types";

/**
 * Parses and decodes a Sony PlayStation 1 (.tim) image into a lossless 32-bit RGBA PNG.
 */
export function convertTimToPng(
	input: Uint8Array | ArrayBuffer,
	options: TimToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): TimConversionResult {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 16) {
		throw new Error(
			"Invalid TIM file: File size is smaller than the minimum 16-byte header.",
		);
	}

	onProgress?.(0.1, "PARSE_HEADER");

	// 1. Verify Magic ID: 0x10, 0x00, 0x00, 0x00
	if (bytes[0] !== 0x10 || bytes[1] !== 0x00) {
		throw new Error(
			"Invalid TIM signature: Expected 0x10 0x00 magic at offset 0.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const flag = view.getUint32(4, true);

	const pmodeVal = flag & 0x07;
	const hasClut = ((flag >> 3) & 0x01) === 1;

	const modeMap: Record<number, TimColorMode> = {
		0: "4bit",
		1: "8bit",
		2: "15bit",
		3: "24bit",
		4: "mixed",
	};

	const mode = modeMap[pmodeVal];
	if (!mode) {
		throw new Error(`Unsupported TIM color mode (${pmodeVal}).`);
	}

	let offset = 8;
	let clutInfo:
		| {
				x: number;
				y: number;
				width: number;
				height: number;
				colors: Uint8Array;
				paletteCount: number;
		  }
		| undefined;

	// 2. Parse CLUT (Color Lookup Table) block if present
	if (hasClut) {
		onProgress?.(0.25, "PARSE_CLUT");
		if (offset + 12 > bytes.length) {
			throw new Error("Invalid TIM file: Incomplete CLUT block header.");
		}

		const clutLength = view.getUint32(offset, true);
		const clutX = view.getUint16(offset + 4, true);
		const clutY = view.getUint16(offset + 6, true);
		const clutW = view.getUint16(offset + 8, true);
		const clutH = view.getUint16(offset + 10, true);

		if (offset + clutLength > bytes.length) {
			throw new Error("Invalid TIM file: CLUT block exceeds file boundary.");
		}

		const totalColors = clutW * clutH;
		const colors = new Uint8Array(totalColors * 4);
		const enableTransparency = options.enableTransparency !== false;

		for (let i = 0; i < totalColors; i++) {
			const colorOffset = offset + 12 + i * 2;
			if (colorOffset + 2 > bytes.length) break;

			const raw = view.getUint16(colorOffset, true);
			const r5 = raw & 0x1f;
			const g5 = (raw >> 5) & 0x1f;
			const b5 = (raw >> 10) & 0x1f;
			const stp = (raw >> 15) & 0x01;

			// Expand 5-bit color to 8-bit [0..255]
			const r = Math.round((r5 * 255) / 31);
			const g = Math.round((g5 * 255) / 31);
			const b = Math.round((b5 * 255) / 31);

			// PlayStation 1 STP transparency rules
			let a = 255;
			if (enableTransparency) {
				if (r5 === 0 && g5 === 0 && b5 === 0) {
					a = stp === 0 ? 0 : 255;
				}
			}

			const outIdx = i * 4;
			colors[outIdx] = r;
			colors[outIdx + 1] = g;
			colors[outIdx + 2] = b;
			colors[outIdx + 3] = a;
		}

		clutInfo = {
			x: clutX,
			y: clutY,
			width: clutW,
			height: clutH,
			colors,
			paletteCount: clutH,
		};

		offset += clutLength;
	}

	// 3. Parse Image Data block
	onProgress?.(0.5, "PARSE_IMAGE");
	if (offset + 12 > bytes.length) {
		throw new Error("Invalid TIM file: Incomplete Image block header.");
	}

	const imgLength = view.getUint32(offset, true);
	const imgX = view.getUint16(offset + 4, true);
	const imgY = view.getUint16(offset + 6, true);
	const imgW = view.getUint16(offset + 8, true);
	const imgH = view.getUint16(offset + 10, true);

	if (offset + imgLength > bytes.length) {
		throw new Error(
			"Invalid TIM file: Image data block exceeds file boundary.",
		);
	}

	let pixelWidth = 0;
	if (mode === "4bit") {
		pixelWidth = imgW * 4;
	} else if (mode === "8bit") {
		pixelWidth = imgW * 2;
	} else if (mode === "15bit" || mode === "mixed") {
		pixelWidth = imgW;
	} else if (mode === "24bit") {
		pixelWidth = Math.floor((imgW * 2) / 3);
	}

	const pixelHeight = imgH;
	if (pixelWidth <= 0 || pixelHeight <= 0) {
		throw new Error(
			`Invalid TIM dimensions: ${pixelWidth}x${pixelHeight} is invalid.`,
		);
	}

	const rawDataOffset = offset + 12;
	const rgba = new Uint8Array(pixelWidth * pixelHeight * 4);

	// 4. Decode pixel data into RGBA buffer
	onProgress?.(0.7, "DECODE_PIXELS");

	if (mode === "4bit") {
		if (!clutInfo) {
			throw new Error("Invalid TIM file: 4-bit indexed mode requires a CLUT.");
		}
		const paletteIdx = Math.max(
			0,
			Math.min(options.paletteIndex ?? 0, clutInfo.paletteCount - 1),
		);
		const palBase = paletteIdx * clutInfo.width * 4;

		let pixelIndex = 0;
		for (let y = 0; y < pixelHeight; y++) {
			const rowStart = rawDataOffset + y * (imgW * 2);
			for (let x = 0; x < imgW * 2; x++) {
				const byteVal = bytes[rowStart + x] ?? 0;
				// Low nibble = pixel 0
				const n0 = byteVal & 0x0f;
				const c0Offset = palBase + n0 * 4;
				const p0 = pixelIndex * 4;
				rgba[p0] = clutInfo.colors[c0Offset] ?? 0;
				rgba[p0 + 1] = clutInfo.colors[c0Offset + 1] ?? 0;
				rgba[p0 + 2] = clutInfo.colors[c0Offset + 2] ?? 0;
				rgba[p0 + 3] = clutInfo.colors[c0Offset + 3] ?? 255;
				pixelIndex++;

				// High nibble = pixel 1
				const n1 = (byteVal >> 4) & 0x0f;
				const c1Offset = palBase + n1 * 4;
				const p1 = pixelIndex * 4;
				rgba[p1] = clutInfo.colors[c1Offset] ?? 0;
				rgba[p1 + 1] = clutInfo.colors[c1Offset + 1] ?? 0;
				rgba[p1 + 2] = clutInfo.colors[c1Offset + 2] ?? 0;
				rgba[p1 + 3] = clutInfo.colors[c1Offset + 3] ?? 255;
				pixelIndex++;
			}
		}
	} else if (mode === "8bit") {
		if (!clutInfo) {
			throw new Error("Invalid TIM file: 8-bit indexed mode requires a CLUT.");
		}
		const paletteIdx = Math.max(
			0,
			Math.min(options.paletteIndex ?? 0, clutInfo.paletteCount - 1),
		);
		const palBase = paletteIdx * clutInfo.width * 4;

		let pixelIndex = 0;
		for (let y = 0; y < pixelHeight; y++) {
			const rowStart = rawDataOffset + y * (imgW * 2);
			for (let x = 0; x < pixelWidth; x++) {
				const colorIdx = bytes[rowStart + x] ?? 0;
				const cOffset = palBase + colorIdx * 4;
				const p = pixelIndex * 4;
				rgba[p] = clutInfo.colors[cOffset] ?? 0;
				rgba[p + 1] = clutInfo.colors[cOffset + 1] ?? 0;
				rgba[p + 2] = clutInfo.colors[cOffset + 2] ?? 0;
				rgba[p + 3] = clutInfo.colors[cOffset + 3] ?? 255;
				pixelIndex++;
			}
		}
	} else if (mode === "15bit" || mode === "mixed") {
		const enableTransparency = options.enableTransparency !== false;
		let pixelIndex = 0;

		for (let y = 0; y < pixelHeight; y++) {
			const rowStart = rawDataOffset + y * (imgW * 2);
			for (let x = 0; x < pixelWidth; x++) {
				const wordOffset = rowStart + x * 2;
				const raw = view.getUint16(wordOffset, true);
				const r5 = raw & 0x1f;
				const g5 = (raw >> 5) & 0x1f;
				const b5 = (raw >> 10) & 0x1f;
				const stp = (raw >> 15) & 0x01;

				const r = Math.round((r5 * 255) / 31);
				const g = Math.round((g5 * 255) / 31);
				const b = Math.round((b5 * 255) / 31);

				let a = 255;
				if (enableTransparency) {
					if (r5 === 0 && g5 === 0 && b5 === 0) {
						a = stp === 0 ? 0 : 255;
					}
				}

				const p = pixelIndex * 4;
				rgba[p] = r;
				rgba[p + 1] = g;
				rgba[p + 2] = b;
				rgba[p + 3] = a;
				pixelIndex++;
			}
		}
	} else if (mode === "24bit") {
		let pixelIndex = 0;
		for (let y = 0; y < pixelHeight; y++) {
			const rowStart = rawDataOffset + y * (imgW * 2);
			for (let x = 0; x < pixelWidth; x++) {
				const byteOffset = rowStart + x * 3;
				const r = bytes[byteOffset] ?? 0;
				const g = bytes[byteOffset + 1] ?? 0;
				const b = bytes[byteOffset + 2] ?? 0;

				const p = pixelIndex * 4;
				rgba[p] = r;
				rgba[p + 1] = g;
				rgba[p + 2] = b;
				rgba[p + 3] = 255;
				pixelIndex++;
			}
		}
	}

	onProgress?.(0.9, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(pixelWidth, pixelHeight, rgba);

	const metadata: TimImageMetadata = {
		mode,
		hasClut,
		width: pixelWidth,
		height: pixelHeight,
		vramX: imgX,
		vramY: imgY,
		clut: clutInfo,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		pngBytes,
	};
}
