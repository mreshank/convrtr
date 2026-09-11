import { encodeRgbaToPng } from "../dds/parser";
import type {
	FitsBitpix,
	FitsConversionOptions,
	FitsConversionResult,
	FitsHeader,
	FitsStretchMode,
} from "./types";

const BLOCK_SIZE = 2880;
const CARD_SIZE = 80;

/**
 * Parse an 80-character FITS card image into keyword and parsed value.
 */
function parseCard(card: string): {
	key: string;
	value: string | number | boolean | null;
	comment?: string;
} {
	const key = card.substring(0, 8).trim();
	if (!key) {
		return { key: "", value: null };
	}

	if (key === "END") {
		return { key: "END", value: null };
	}

	if (card.length > 8 && card[8] === "=") {
		const rest = card.substring(9);
		const slashIdx = rest.indexOf("/");
		let valPart = slashIdx >= 0 ? rest.substring(0, slashIdx) : rest;
		const comment = slashIdx >= 0 ? rest.substring(slashIdx + 1).trim() : "";
		valPart = valPart.trim();

		// String value enclosed in single quotes
		if (valPart.startsWith("'")) {
			const endQuote = valPart.lastIndexOf("'");
			if (endQuote > 0) {
				const strVal = valPart.substring(1, endQuote).trim();
				return { key, value: strVal, comment };
			}
		}

		// Boolean value
		if (valPart === "T") return { key, value: true, comment };
		if (valPart === "F") return { key, value: false, comment };

		// Numeric value
		const num = Number(valPart);
		if (!Number.isNaN(num)) {
			return { key, value: num, comment };
		}

		return { key, value: valPart, comment };
	}

	// Comment, history, or blank card
	return { key, value: card.substring(8).trim() };
}

/**
 * Parses the primary header of a FITS file.
 */
export function parseFitsHeader(input: Uint8Array | ArrayBuffer): FitsHeader {
	const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (buffer.length < BLOCK_SIZE) {
		throw new Error(
			`Invalid FITS file: buffer size (${buffer.length} bytes) is less than minimum 2880 bytes.`,
		);
	}

	const decoder = new TextDecoder("ascii");
	let blockOffset = 0;
	let foundEnd = false;
	const metadata: Record<string, string | number | boolean> = {};

	let simple = false;
	let bitpix: FitsBitpix = 16;
	let naxis = 0;
	let naxis1 = 0;
	let naxis2 = 0;
	let naxis3: number | undefined;
	let bscale = 1.0;
	let bzero = 0.0;
	let extend: boolean | undefined;

	let objectName: string | undefined;
	let telescope: string | undefined;
	let instrument: string | undefined;
	let dateObs: string | undefined;
	let exposureTime: number | undefined;
	let filter: string | undefined;

	while (blockOffset + BLOCK_SIZE <= buffer.length) {
		const blockText = decoder.decode(
			buffer.subarray(blockOffset, blockOffset + BLOCK_SIZE),
		);

		for (let c = 0; c < BLOCK_SIZE; c += CARD_SIZE) {
			const card = blockText.substring(c, c + CARD_SIZE);
			const { key, value } = parseCard(card);

			if (key === "END") {
				foundEnd = true;
				break;
			}

			if (!key) continue;

			if (key === "SIMPLE") simple = value === true;
			else if (key === "BITPIX" && typeof value === "number")
				bitpix = value as FitsBitpix;
			else if (key === "NAXIS" && typeof value === "number") naxis = value;
			else if (key === "NAXIS1" && typeof value === "number") naxis1 = value;
			else if (key === "NAXIS2" && typeof value === "number") naxis2 = value;
			else if (key === "NAXIS3" && typeof value === "number") naxis3 = value;
			else if (key === "BSCALE" && typeof value === "number") bscale = value;
			else if (key === "BZERO" && typeof value === "number") bzero = value;
			else if (key === "EXTEND") extend = value === true;
			else if (key === "OBJECT" && typeof value === "string")
				objectName = value;
			else if (key === "TELESCOP" && typeof value === "string")
				telescope = value;
			else if (key === "INSTRUME" && typeof value === "string")
				instrument = value;
			else if (key === "DATE-OBS" && typeof value === "string") dateObs = value;
			else if (key === "EXPTIME" && typeof value === "number")
				exposureTime = value;
			else if (key === "FILTER" && typeof value === "string") filter = value;

			if (value !== null && value !== undefined && typeof value !== "object") {
				metadata[key] = value;
			}
		}

		blockOffset += BLOCK_SIZE;
		if (foundEnd) break;
	}

	if (!foundEnd) {
		throw new Error(
			"Invalid FITS file: missing END card in 2880-byte header blocks.",
		);
	}

	if (!simple) {
		throw new Error(
			"Invalid FITS file: SIMPLE keyword is missing or not set to True.",
		);
	}

	return {
		simple,
		bitpix,
		naxis,
		naxis1,
		naxis2,
		naxis3,
		bscale,
		bzero,
		extend,
		objectName,
		telescope,
		instrument,
		dateObs,
		exposureTime,
		filter,
		metadata,
		headerBytes: blockOffset,
	};
}

/**
 * Extracts and auto-stretches 2D FITS image data into a standard PNG Uint8Array.
 */
export function convertFitsToPng(
	input: Uint8Array | ArrayBuffer,
	options: FitsConversionOptions = {},
): FitsConversionResult {
	const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
	const header = parseFitsHeader(buffer);

	if (header.naxis < 2 || header.naxis1 <= 0 || header.naxis2 <= 0) {
		throw new Error(
			`Cannot convert FITS to PNG: invalid dimensions NAXIS=${header.naxis}, NAXIS1=${header.naxis1}, NAXIS2=${header.naxis2}.`,
		);
	}

	const width = header.naxis1;
	const height = header.naxis2;
	const pixelCount = width * height;
	const isRgb = header.naxis >= 3 && header.naxis3 === 3;
	const stretch: FitsStretchMode = options.stretch ?? "percentile";
	const invertY = options.invertY ?? true;

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);
	const dataPtr = header.headerBytes;

	// Calculate bytes per pixel
	let bytesPerPixel = 1;
	switch (header.bitpix) {
		case 8:
			bytesPerPixel = 1;
			break;
		case 16:
			bytesPerPixel = 2;
			break;
		case 32:
		case -32:
			bytesPerPixel = 4;
			break;
		case 64:
		case -64:
			bytesPerPixel = 8;
			break;
		default:
			throw new Error(`Unsupported FITS BITPIX: ${header.bitpix}`);
	}

	// Function to read raw numeric slice
	const readSlice = (sliceOffset: number): Float64Array => {
		const out = new Float64Array(pixelCount);
		let ptr = sliceOffset;

		for (let i = 0; i < pixelCount; i++) {
			if (ptr + bytesPerPixel > buffer.length) {
				out[i] = 0;
				continue;
			}

			let raw = 0;
			switch (header.bitpix) {
				case 8:
					raw = buffer[ptr] ?? 0;
					break;
				case 16:
					raw = view.getInt16(ptr, false); // Big-endian
					break;
				case 32:
					raw = view.getInt32(ptr, false);
					break;
				case 64:
					raw = Number(view.getBigInt64(ptr, false));
					break;
				case -32:
					raw = view.getFloat32(ptr, false);
					break;
				case -64:
					raw = view.getFloat64(ptr, false);
					break;
			}

			ptr += bytesPerPixel;
			// Apply BSCALE and BZERO physical scaling
			const physical = header.bzero + header.bscale * raw;
			out[i] = Number.isFinite(physical) ? physical : 0;
		}

		return out;
	};

	const sliceSize = pixelCount * bytesPerPixel;
	const sliceIdx = options.sliceIndex ?? 0;

	// Read channel data
	let redChannel: Float64Array;
	let greenChannel: Float64Array | null = null;
	let blueChannel: Float64Array | null = null;

	if (isRgb) {
		redChannel = readSlice(dataPtr);
		greenChannel = readSlice(dataPtr + sliceSize);
		blueChannel = readSlice(dataPtr + sliceSize * 2);
	} else {
		const offset = dataPtr + sliceIdx * sliceSize;
		redChannel = readSlice(offset);
	}

	// Calculate global min/max for scaling
	let minVal = Number.POSITIVE_INFINITY;
	let maxVal = Number.NEGATIVE_INFINITY;

	for (let i = 0; i < pixelCount; i++) {
		const v = redChannel[i] ?? 0;
		if (v < minVal) minVal = v;
		if (v > maxVal) maxVal = v;
		if (greenChannel && blueChannel) {
			const vg = greenChannel[i] ?? 0;
			const vb = blueChannel[i] ?? 0;
			if (vg < minVal) minVal = vg;
			if (vg > maxVal) maxVal = vg;
			if (vb < minVal) minVal = vb;
			if (vb > maxVal) maxVal = vb;
		}
	}

	if (!Number.isFinite(minVal)) minVal = 0;
	if (!Number.isFinite(maxVal)) maxVal = 1;

	// Percentile calculation for astronomical stretch
	let lowBound = minVal;
	let highBound = maxVal;

	if (stretch === "percentile" && pixelCount > 10) {
		// Sample up to 10,000 pixels to calculate fast percentiles
		const sampleSize = Math.min(pixelCount, 10000);
		const step = Math.max(1, Math.floor(pixelCount / sampleSize));
		const samples: number[] = [];
		for (let i = 0; i < pixelCount; i += step) {
			samples.push(redChannel[i] ?? 0);
		}
		samples.sort((a, b) => a - b);

		const pLow = options.percentileLow ?? 0.005; // 0.5%
		const pHigh = options.percentileHigh ?? 0.995; // 99.5%
		const lowIdx = Math.floor(samples.length * pLow);
		const highIdx = Math.min(
			samples.length - 1,
			Math.floor(samples.length * pHigh),
		);

		lowBound = samples[lowIdx] ?? minVal;
		highBound = samples[highIdx] ?? maxVal;
	}

	const range = highBound - lowBound;

	const stretchValue = (val: number): number => {
		if (range <= 0) return 128;
		let norm = (val - lowBound) / range;
		if (norm < 0) norm = 0;
		if (norm > 1) norm = 1;

		if (stretch === "asinh") {
			// Astronomical asinh stretch
			const beta = 10;
			norm = Math.asinh(beta * norm) / Math.asinh(beta);
		}

		return Math.round(norm * 255);
	};

	// Construct 32-bit RGBA buffer
	const rgba = new Uint8Array(width * height * 4);

	for (let y = 0; y < height; y++) {
		// FITS row 0 is bottom row if inverted
		const srcY = invertY ? height - 1 - y : y;
		const rowOffsetSrc = srcY * width;
		const rowOffsetDst = y * width * 4;

		for (let x = 0; x < width; x++) {
			const srcIdx = rowOffsetSrc + x;
			const dstIdx = rowOffsetDst + x * 4;

			if (isRgb && greenChannel && blueChannel) {
				rgba[dstIdx] = stretchValue(redChannel[srcIdx] ?? 0);
				rgba[dstIdx + 1] = stretchValue(greenChannel[srcIdx] ?? 0);
				rgba[dstIdx + 2] = stretchValue(blueChannel[srcIdx] ?? 0);
				rgba[dstIdx + 3] = 255;
			} else {
				const gray = stretchValue(redChannel[srcIdx] ?? 0);
				rgba[dstIdx] = gray;
				rgba[dstIdx + 1] = gray;
				rgba[dstIdx + 2] = gray;
				rgba[dstIdx + 3] = 255;
			}
		}
	}

	const pngBuffer = encodeRgbaToPng(width, height, rgba);

	return {
		pngBuffer,
		width,
		height,
		bitpix: header.bitpix,
		minValue: minVal,
		maxValue: maxVal,
		metadata: header.metadata,
	};
}
