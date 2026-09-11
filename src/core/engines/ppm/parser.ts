import { encodeRgbaToPng } from "../dds/parser";
import type { NetpbmFormat, NetpbmImage, PpmToPngOptions } from "./types";

/**
 * Parses and decodes any Netpbm image format (PBM, PGM, PPM, PAM)
 * into a standard 32-bit RGBA raw pixel array.
 */
export function parseNetpbm(
	buffer: Uint8Array,
	options: PpmToPngOptions = {},
): NetpbmImage {
	if (buffer.length < 3) {
		throw new Error("Invalid Netpbm file: Buffer is too small.");
	}

	if (buffer[0] !== 0x50) {
		// 'P'
		throw new Error(
			"Invalid Netpbm signature: Expected magic starting with 'P'.",
		);
	}

	const formatChar = String.fromCharCode(buffer[1] ?? 0);
	if (!["1", "2", "3", "4", "5", "6", "7"].includes(formatChar)) {
		throw new Error(`Unsupported Netpbm format 'P${formatChar}'.`);
	}

	const format = `P${formatChar}` as NetpbmFormat;

	if (format === "P7") {
		return parsePam(buffer);
	}

	let ptr = 2;

	// Helper to skip whitespace and '#' comments
	function skipWhitespaceAndComments() {
		while (ptr < buffer.length) {
			const b = buffer[ptr] ?? 0;
			// Whitespace: space (32), tab (9), CR (13), LF (10)
			if (b === 32 || b === 9 || b === 13 || b === 10) {
				ptr++;
				continue;
			}
			// Comment: '#'
			if (b === 35) {
				ptr++;
				while (ptr < buffer.length && (buffer[ptr] ?? 0) !== 10) {
					ptr++;
				}
				if (ptr < buffer.length) ptr++; // skip LF
				continue;
			}
			break;
		}
	}

	// Helper to read next ASCII decimal integer
	function readNextInt(): number {
		skipWhitespaceAndComments();
		if (ptr >= buffer.length) {
			throw new Error("Premature EOF while reading Netpbm header.");
		}
		let numStr = "";
		while (ptr < buffer.length) {
			const b = buffer[ptr] ?? 0;
			if (b >= 48 && b <= 57) {
				// '0'-'9'
				numStr += String.fromCharCode(b);
				ptr++;
			} else {
				break;
			}
		}
		if (numStr.length === 0) {
			throw new Error(
				`Invalid Netpbm header token at offset ${ptr}: expected integer.`,
			);
		}
		return parseInt(numStr, 10);
	}

	const width = readNextInt();
	const height = readNextInt();

	if (width <= 0 || height <= 0 || width > 16384 || height > 16384) {
		throw new Error(
			`Invalid Netpbm image dimensions: ${width}x${height} exceeds maximum bounds.`,
		);
	}

	let maxVal = 1;
	if (format !== "P1" && format !== "P4") {
		maxVal = readNextInt();
		if (maxVal <= 0 || maxVal > 65535) {
			throw new Error(`Invalid Netpbm maxVal: ${maxVal}.`);
		}
	}

	// For binary formats (P4, P5, P6), exactly one whitespace character follows maxVal
	if (format === "P4" || format === "P5" || format === "P6") {
		if (ptr < buffer.length) {
			const b = buffer[ptr] ?? 0;
			if (b === 32 || b === 9 || b === 13 || b === 10) {
				ptr++;
			}
		}
	}

	const pixelCount = width * height;
	const rgba = new Uint8Array(pixelCount * 4);

	switch (format) {
		case "P1": {
			// ASCII PBM: 1 = black, 0 = white
			let p = 0;
			for (let i = 0; i < pixelCount; i++) {
				const val = readNextInt();
				const isBlack = val === 1;
				const c = (options.invertMonochrome ? !isBlack : isBlack) ? 0 : 255;
				rgba[p] = c;
				rgba[p + 1] = c;
				rgba[p + 2] = c;
				rgba[p + 3] = 255;
				p += 4;
			}
			break;
		}

		case "P4": {
			// Binary PBM: 1 = black, 0 = white, packed MSB-first per row
			const rowBytes = Math.ceil(width / 8);
			let p = 0;
			for (let y = 0; y < height; y++) {
				const rowOffset = ptr + y * rowBytes;
				if (rowOffset + rowBytes > buffer.length) {
					break;
				}
				for (let x = 0; x < width; x++) {
					const byteIdx = rowOffset + Math.floor(x / 8);
					const bitIdx = 7 - (x % 8);
					const bit = ((buffer[byteIdx] ?? 0) >> bitIdx) & 1;
					const isBlack = bit === 1;
					const c = (options.invertMonochrome ? !isBlack : isBlack) ? 0 : 255;
					rgba[p] = c;
					rgba[p + 1] = c;
					rgba[p + 2] = c;
					rgba[p + 3] = 255;
					p += 4;
				}
			}
			break;
		}

		case "P2": {
			// ASCII PGM: Grayscale
			const scale = 255 / maxVal;
			let p = 0;
			for (let i = 0; i < pixelCount; i++) {
				const val = readNextInt();
				const c = Math.min(255, Math.max(0, Math.round(val * scale)));
				rgba[p] = c;
				rgba[p + 1] = c;
				rgba[p + 2] = c;
				rgba[p + 3] = 255;
				p += 4;
			}
			break;
		}

		case "P5": {
			// Binary PGM: Grayscale
			const is16Bit = maxVal >= 256;
			const scale = 255 / maxVal;
			let p = 0;
			for (let i = 0; i < pixelCount; i++) {
				let val = 0;
				if (is16Bit) {
					if (ptr + 2 > buffer.length) break;
					val = ((buffer[ptr] ?? 0) << 8) | (buffer[ptr + 1] ?? 0);
					ptr += 2;
				} else {
					if (ptr >= buffer.length) break;
					val = buffer[ptr] ?? 0;
					ptr++;
				}
				const c = Math.min(255, Math.max(0, Math.round(val * scale)));
				rgba[p] = c;
				rgba[p + 1] = c;
				rgba[p + 2] = c;
				rgba[p + 3] = 255;
				p += 4;
			}
			break;
		}

		case "P3": {
			// ASCII PPM: RGB
			const scale = 255 / maxVal;
			let p = 0;
			for (let i = 0; i < pixelCount; i++) {
				const r = Math.min(255, Math.max(0, Math.round(readNextInt() * scale)));
				const g = Math.min(255, Math.max(0, Math.round(readNextInt() * scale)));
				const b = Math.min(255, Math.max(0, Math.round(readNextInt() * scale)));
				rgba[p] = r;
				rgba[p + 1] = g;
				rgba[p + 2] = b;
				rgba[p + 3] = 255;
				p += 4;
			}
			break;
		}

		case "P6": {
			// Binary PPM: RGB
			const is16Bit = maxVal >= 256;
			const scale = 255 / maxVal;
			let p = 0;
			for (let i = 0; i < pixelCount; i++) {
				let r = 0;
				let g = 0;
				let b = 0;
				if (is16Bit) {
					if (ptr + 6 > buffer.length) break;
					r = ((buffer[ptr] ?? 0) << 8) | (buffer[ptr + 1] ?? 0);
					g = ((buffer[ptr + 2] ?? 0) << 8) | (buffer[ptr + 3] ?? 0);
					b = ((buffer[ptr + 4] ?? 0) << 8) | (buffer[ptr + 5] ?? 0);
					ptr += 6;
				} else {
					if (ptr + 3 > buffer.length) break;
					r = buffer[ptr] ?? 0;
					g = buffer[ptr + 1] ?? 0;
					b = buffer[ptr + 2] ?? 0;
					ptr += 3;
				}
				rgba[p] = Math.min(255, Math.max(0, Math.round(r * scale)));
				rgba[p + 1] = Math.min(255, Math.max(0, Math.round(g * scale)));
				rgba[p + 2] = Math.min(255, Math.max(0, Math.round(b * scale)));
				rgba[p + 3] = 255;
				p += 4;
			}
			break;
		}
	}

	return {
		format,
		width,
		height,
		maxVal,
		rgba,
	};
}

/**
 * Parses a Netpbm P7 (Portable Arbitrary Map / PAM) image.
 */
function parsePam(buffer: Uint8Array): NetpbmImage {
	const textHeaderLimit = Math.min(buffer.length, 4096);
	const text = new TextDecoder("ascii").decode(
		buffer.subarray(0, textHeaderLimit),
	);

	const endHdrMatch = text.match(/\bENDHDR\s/);
	if (!endHdrMatch || endHdrMatch.index === undefined) {
		throw new Error("Invalid PAM file: Missing 'ENDHDR' terminator.");
	}

	const headerLines = text
		.slice(0, endHdrMatch.index)
		.split(/\r?\n/)
		.map((line) => line.replace(/#.*$/, "").trim())
		.filter((line) => line.length > 0);

	let width = 0;
	let height = 0;
	let depth = 3;
	let maxVal = 255;

	for (const line of headerLines) {
		const parts = line.split(/\s+/);
		const key = parts[0]?.toUpperCase();
		const val = parts[1];
		if (!val) continue;

		if (key === "WIDTH") width = parseInt(val, 10);
		else if (key === "HEIGHT") height = parseInt(val, 10);
		else if (key === "DEPTH") depth = parseInt(val, 10);
		else if (key === "MAXVAL") maxVal = parseInt(val, 10);
	}

	if (width <= 0 || height <= 0) {
		throw new Error(`Invalid PAM dimensions: ${width}x${height}.`);
	}

	const dataOffset = endHdrMatch.index + endHdrMatch[0].length;
	let ptr = dataOffset;
	const pixelCount = width * height;
	const rgba = new Uint8Array(pixelCount * 4);
	const is16Bit = maxVal >= 256;
	const scale = 255 / maxVal;

	let p = 0;
	for (let i = 0; i < pixelCount; i++) {
		const samples: number[] = [];
		for (let d = 0; d < depth; d++) {
			if (is16Bit) {
				if (ptr + 2 > buffer.length) break;
				const s = ((buffer[ptr] ?? 0) << 8) | (buffer[ptr + 1] ?? 0);
				ptr += 2;
				samples.push(s);
			} else {
				if (ptr >= buffer.length) break;
				samples.push(buffer[ptr] ?? 0);
				ptr++;
			}
		}

		if (depth === 1) {
			// Grayscale or B&W
			const gray = Math.min(
				255,
				Math.max(0, Math.round((samples[0] ?? 0) * scale)),
			);
			rgba[p] = gray;
			rgba[p + 1] = gray;
			rgba[p + 2] = gray;
			rgba[p + 3] = 255;
		} else if (depth === 2) {
			// Grayscale + Alpha
			const gray = Math.min(
				255,
				Math.max(0, Math.round((samples[0] ?? 0) * scale)),
			);
			const a = Math.min(
				255,
				Math.max(0, Math.round((samples[1] ?? 0) * scale)),
			);
			rgba[p] = gray;
			rgba[p + 1] = gray;
			rgba[p + 2] = gray;
			rgba[p + 3] = a;
		} else if (depth === 3) {
			// RGB
			rgba[p] = Math.min(
				255,
				Math.max(0, Math.round((samples[0] ?? 0) * scale)),
			);
			rgba[p + 1] = Math.min(
				255,
				Math.max(0, Math.round((samples[1] ?? 0) * scale)),
			);
			rgba[p + 2] = Math.min(
				255,
				Math.max(0, Math.round((samples[2] ?? 0) * scale)),
			);
			rgba[p + 3] = 255;
		} else if (depth >= 4) {
			// RGBA
			rgba[p] = Math.min(
				255,
				Math.max(0, Math.round((samples[0] ?? 0) * scale)),
			);
			rgba[p + 1] = Math.min(
				255,
				Math.max(0, Math.round((samples[1] ?? 0) * scale)),
			);
			rgba[p + 2] = Math.min(
				255,
				Math.max(0, Math.round((samples[2] ?? 0) * scale)),
			);
			rgba[p + 3] = Math.min(
				255,
				Math.max(0, Math.round((samples[3] ?? 0) * scale)),
			);
		}
		p += 4;
	}

	return {
		format: "P7",
		width,
		height,
		maxVal,
		rgba,
	};
}

/**
 * Converts any Netpbm image buffer (PBM, PGM, PPM, PAM) into a standard PNG buffer.
 */
export function convertPpmToPng(
	input: ArrayBuffer | Uint8Array,
	options: PpmToPngOptions = {},
): Uint8Array {
	const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
	const img = parseNetpbm(buf, options);
	return encodeRgbaToPng(img.width, img.height, img.rgba);
}
