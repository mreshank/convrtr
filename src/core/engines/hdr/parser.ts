import { encodeRgbaToPng } from "../dds/parser";
import type {
	HdrConversionOptions,
	HdrConversionResult,
	HdrMetadata,
} from "./types";

/**
 * Converts Radiance HDR (.hdr / .pic) RGBE floating-point images into
 * tone-mapped 32-bit RGBA PNG files.
 */
export function convertHdrToPng(
	input: ArrayBuffer | Uint8Array,
	options: HdrConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): HdrConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 16) {
		throw new Error(
			"Invalid HDR file: Buffer size is too small to contain a valid Radiance header.",
		);
	}

	// 1. Verify Magic (#?RADIANCE, #?RGBE, or generic #?)
	let ptr = 0;
	if (bytes[0] !== 0x23 || bytes[1] !== 0x3f) {
		// '#?'
		throw new Error(
			"Invalid HDR file: Missing Radiance identifier magic '#?' at file start.",
		);
	}

	// 2. Read Header lines until blank line
	let headerEnd = -1;
	for (let i = 0; i < Math.min(bytes.length - 1, 4096); i++) {
		if (bytes[i] === 0x0a && bytes[i + 1] === 0x0a) {
			headerEnd = i + 2;
			break;
		}
		if (
			i < bytes.length - 3 &&
			bytes[i] === 0x0d &&
			bytes[i + 1] === 0x0a &&
			bytes[i + 2] === 0x0d &&
			bytes[i + 3] === 0x0a
		) {
			headerEnd = i + 4;
			break;
		}
	}

	if (headerEnd === -1) {
		throw new Error("Invalid HDR file: Premature end of Radiance header.");
	}

	const headerText = new TextDecoder("ascii").decode(
		bytes.subarray(0, headerEnd),
	);
	const headerLines = headerText.split(/\r?\n/);

	let format = "32-bit_rle_rgbe";
	let parsedExposure = 1.0;
	let parsedGamma = 2.2;

	for (const line of headerLines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("FORMAT=")) {
			format = trimmed.substring(7);
		} else if (trimmed.startsWith("EXPOSURE=")) {
			const expVal = Number.parseFloat(trimmed.substring(9));
			if (!Number.isNaN(expVal) && expVal > 0) {
				parsedExposure = expVal;
			}
		} else if (trimmed.startsWith("GAMMA=")) {
			const gammaVal = Number.parseFloat(trimmed.substring(6));
			if (!Number.isNaN(gammaVal) && gammaVal > 0) {
				parsedGamma = gammaVal;
			}
		}
	}

	// 3. Parse Resolution Line (e.g. -Y 1024 +X 2048)
	ptr = headerEnd;
	let resLineEnd = -1;
	for (let i = ptr; i < Math.min(bytes.length, ptr + 256); i++) {
		if (bytes[i] === 0x0a) {
			resLineEnd = i + 1;
			break;
		}
	}

	if (resLineEnd === -1) {
		throw new Error("Invalid HDR file: Missing resolution string.");
	}

	const resLine = new TextDecoder("ascii")
		.decode(bytes.subarray(ptr, resLineEnd))
		.trim();
	ptr = resLineEnd;

	// Pattern match resolution (standard is -Y <h> +X <w>)
	const resMatch = resLine.match(/([+-][XY])\s+(\d+)\s+([+-][XY])\s+(\d+)/i);
	if (!resMatch) {
		throw new Error(`Invalid HDR resolution line: "${resLine}"`);
	}

	const axis1 = (resMatch[1] ?? "").toUpperCase();
	const val1 = Number.parseInt(resMatch[2] ?? "0", 10);
	const axis2 = (resMatch[3] ?? "").toUpperCase();
	const val2 = Number.parseInt(resMatch[4] ?? "0", 10);

	let width = 0;
	let height = 0;

	if (axis1 === "-Y" && axis2 === "+X") {
		height = val1;
		width = val2;
	} else if (axis1 === "+Y" && axis2 === "+X") {
		height = val1;
		width = val2;
	} else if (axis1 === "-X" && axis2 === "+Y") {
		width = val1;
		height = val2;
	} else if (axis1.includes("X")) {
		width = val1;
		height = val2;
	} else {
		height = val1;
		width = val2;
	}

	if (width <= 0 || height <= 0 || width > 65536 || height > 65536) {
		throw new Error(
			`Invalid HDR dimensions: ${width}x${height} exceeds supported range.`,
		);
	}

	onProgress?.(0.2, "DECODE_SCANLINES");

	// 4. Decode scanlines into RGBE buffer
	const totalPixels = width * height;
	const rgbeBuffer = new Uint8Array(totalPixels * 4);

	for (let y = 0; y < height; y++) {
		if (ptr >= bytes.length) break;

		// Check for new-style adaptive RLE scanline
		const isRle =
			width >= 8 &&
			width <= 32767 &&
			bytes[ptr] === 0x02 &&
			bytes[ptr + 1] === 0x02 &&
			bytes[ptr + 2] === width >> 8 &&
			bytes[ptr + 3] === (width & 0xff);

		if (isRle) {
			ptr += 4;
			// 4 separate channel runs: R, G, B, E
			const scanlineChannels = new Uint8Array(width * 4);

			for (let ch = 0; ch < 4; ch++) {
				let chPos = 0;
				while (chPos < width && ptr < bytes.length) {
					const code = bytes[ptr++] ?? 0;
					if (code > 128) {
						// Run
						const count = code - 128;
						const val = bytes[ptr++] ?? 0;
						for (let k = 0; k < count && chPos < width; k++) {
							scanlineChannels[ch * width + chPos++] = val;
						}
					} else {
						// Non-run
						const count = code;
						for (
							let k = 0;
							k < count && chPos < width && ptr < bytes.length;
							k++
						) {
							scanlineChannels[ch * width + chPos++] = bytes[ptr++] ?? 0;
						}
					}
				}
			}

			// Interleave scanline channels into rgbeBuffer
			const lineOffset = y * width * 4;
			for (let x = 0; x < width; x++) {
				const pxOffset = lineOffset + x * 4;
				rgbeBuffer[pxOffset] = scanlineChannels[x] ?? 0; // R
				rgbeBuffer[pxOffset + 1] = scanlineChannels[width + x] ?? 0; // G
				rgbeBuffer[pxOffset + 2] = scanlineChannels[2 * width + x] ?? 0; // B
				rgbeBuffer[pxOffset + 3] = scanlineChannels[3 * width + x] ?? 0; // E
			}
		} else {
			// Old-style RLE or uncompressed scanline
			let x = 0;
			const lineOffset = y * width * 4;

			while (x < width && ptr + 3 < bytes.length) {
				const r = bytes[ptr++] ?? 0;
				const g = bytes[ptr++] ?? 0;
				const b = bytes[ptr++] ?? 0;
				const e = bytes[ptr++] ?? 0;

				if (r === 1 && g === 1 && b === 1) {
					// Old run
					const count = e << 8;
					const lastPxOffset = lineOffset + (x - 1) * 4;
					const prevR = x > 0 ? (rgbeBuffer[lastPxOffset] ?? 0) : 0;
					const prevG = x > 0 ? (rgbeBuffer[lastPxOffset + 1] ?? 0) : 0;
					const prevB = x > 0 ? (rgbeBuffer[lastPxOffset + 2] ?? 0) : 0;
					const prevE = x > 0 ? (rgbeBuffer[lastPxOffset + 3] ?? 0) : 0;

					for (let k = 0; k < count && x < width; k++) {
						const pxOffset = lineOffset + x * 4;
						rgbeBuffer[pxOffset] = prevR;
						rgbeBuffer[pxOffset + 1] = prevG;
						rgbeBuffer[pxOffset + 2] = prevB;
						rgbeBuffer[pxOffset + 3] = prevE;
						x++;
					}
				} else {
					const pxOffset = lineOffset + x * 4;
					rgbeBuffer[pxOffset] = r;
					rgbeBuffer[pxOffset + 1] = g;
					rgbeBuffer[pxOffset + 2] = b;
					rgbeBuffer[pxOffset + 3] = e;
					x++;
				}
			}
		}
	}

	onProgress?.(0.6, "TONE_MAPPING");

	// 5. Convert RGBE to Linear Floats, Apply Reinhard Tone-Mapping & sRGB Gamma
	const exposure = options.exposure ?? parsedExposure ?? 1.0;
	const gamma = options.gamma ?? parsedGamma ?? 2.2;
	const invGamma = 1.0 / gamma;

	const rgba = new Uint8Array(totalPixels * 4);

	function toSrgb(v: number): number {
		const c = Math.max(0, Math.min(1, v));
		// Gamma curve with power approximation
		return Math.round(c ** invGamma * 255);
	}

	for (let i = 0; i < totalPixels; i++) {
		const src = i * 4;
		const dst = i * 4;

		const r = rgbeBuffer[src] ?? 0;
		const g = rgbeBuffer[src + 1] ?? 0;
		const b = rgbeBuffer[src + 2] ?? 0;
		const e = rgbeBuffer[src + 3] ?? 0;

		if (e === 0) {
			rgba[dst] = 0;
			rgba[dst + 1] = 0;
			rgba[dst + 2] = 0;
			rgba[dst + 3] = 255;
		} else {
			// Radiance RGBE standard exponent: ldexp((v + 0.5) / 256.0, e - 128)
			// Equivalent to v * 2^(e - 136)
			const f = 2.0 ** (e - 136);
			const rLin = r * f * exposure;
			const gLin = g * f * exposure;
			const bLin = b * f * exposure;

			// Reinhard tone mapping: x / (1 + x)
			const rTone = rLin / (1.0 + rLin);
			const gTone = gLin / (1.0 + gLin);
			const bTone = bLin / (1.0 + bLin);

			rgba[dst] = toSrgb(rTone);
			rgba[dst + 1] = toSrgb(gTone);
			rgba[dst + 2] = toSrgb(bTone);
			rgba[dst + 3] = 255; // Solid alpha
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");
	const pngBytes = encodeRgbaToPng(width, height, rgba);
	onProgress?.(1.0, "COMPLETE");

	const metadata: HdrMetadata = {
		width,
		height,
		format,
		exposure,
		gamma,
	};

	return {
		metadata,
		pngBytes,
	};
}
