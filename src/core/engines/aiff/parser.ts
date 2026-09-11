import { encodePcmToWav } from "../voc/parser";

export interface AiffMetadata {
	numChannels: number;
	sampleRate: number;
	sampleSize: number;
	numSampleFrames: number;
	durationSeconds: number;
	wavBytes: Uint8Array;
}

/**
 * Decodes an 80-bit IEEE 754 extended precision float (big-endian).
 */
export function readExtended80(view: DataView, offset: number): number {
	const signAndExp = view.getUint16(offset, false);
	const sign = (signAndExp & 0x8000) !== 0 ? -1 : 1;
	const exponent = signAndExp & 0x7fff;
	const hiMant = view.getUint32(offset + 2, false);
	const loMant = view.getUint32(offset + 6, false);

	if (exponent === 0 && hiMant === 0 && loMant === 0) {
		return 0;
	}

	if (exponent === 0x7fff) {
		return Number.POSITIVE_INFINITY;
	}

	const mantissa = hiMant * 2 ** -31 + loMant * 2 ** -63;
	return sign * mantissa * 2 ** (exponent - 16383);
}

/**
 * Encodes a number into an 80-bit IEEE 754 extended precision float (big-endian).
 * Useful for synthesizing mock AIFF audio files in test suites.
 */
export function writeExtended80(
	view: DataView,
	offset: number,
	value: number,
): void {
	if (value === 0) {
		view.setUint16(offset, 0, false);
		view.setUint32(offset + 2, 0, false);
		view.setUint32(offset + 6, 0, false);
		return;
	}

	let sign = 0;
	if (value < 0) {
		sign = 0x8000;
		value = -value;
	}

	let exponent = Math.floor(Math.log2(value));
	let normalized = value / 2 ** exponent;

	if (normalized >= 2) {
		normalized /= 2;
		exponent++;
	} else if (normalized < 1) {
		normalized *= 2;
		exponent--;
	}

	const expField = (exponent + 16383) | sign;
	view.setUint16(offset, expField, false);

	const hiMant = Math.floor(normalized * 2 ** 31) >>> 0;
	const loMant = Math.floor((normalized * 2 ** 31 - hiMant) * 2 ** 32) >>> 0;

	view.setUint32(offset + 2, hiMant, false);
	view.setUint32(offset + 6, loMant, false);
}

/**
 * Parses an Apple Audio Interchange File Format (.aif / .aiff) binary buffer.
 */
export function parseAiff(buffer: Uint8Array): AiffMetadata {
	if (buffer.length < 12) {
		throw new Error(
			"Invalid AIFF file: Buffer size is smaller than the 12-byte FORM header.",
		);
	}

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	// FORM chunk check
	const formSig = String.fromCharCode(
		buffer[0] ?? 0,
		buffer[1] ?? 0,
		buffer[2] ?? 0,
		buffer[3] ?? 0,
	);
	if (formSig !== "FORM") {
		throw new Error(
			`Invalid AIFF signature: Expected 'FORM', received '${formSig}'.`,
		);
	}

	const aiffType = String.fromCharCode(
		buffer[8] ?? 0,
		buffer[9] ?? 0,
		buffer[10] ?? 0,
		buffer[11] ?? 0,
	);
	if (aiffType !== "AIFF" && aiffType !== "AIFC") {
		throw new Error(
			`Invalid AIFF form type: Expected 'AIFF' or 'AIFC', received '${aiffType}'.`,
		);
	}

	let numChannels = 0;
	let numSampleFrames = 0;
	let sampleSize = 0;
	let sampleRate = 0;

	let soundDataOffset = -1;
	let soundDataLength = 0;

	let offset = 12;
	const maxOffset = buffer.length;

	while (offset + 8 <= maxOffset) {
		const chunkId = String.fromCharCode(
			buffer[offset] ?? 0,
			buffer[offset + 1] ?? 0,
			buffer[offset + 2] ?? 0,
			buffer[offset + 3] ?? 0,
		);
		const chunkSize = view.getUint32(offset + 4, false);
		const chunkDataStart = offset + 8;

		if (chunkId === "COMM" && chunkSize >= 18) {
			numChannels = view.getUint16(chunkDataStart, false);
			numSampleFrames = view.getUint32(chunkDataStart + 2, false);
			sampleSize = view.getUint16(chunkDataStart + 6, false);
			sampleRate = Math.round(readExtended80(view, chunkDataStart + 8));
		} else if (chunkId === "SSND" && chunkSize >= 8) {
			const ssndOffset = view.getUint32(chunkDataStart, false);
			soundDataOffset = chunkDataStart + 8 + ssndOffset;
			soundDataLength = chunkSize - 8 - ssndOffset;
		}

		// Chunks are padded to even byte boundaries
		offset += 8 + chunkSize + (chunkSize % 2);
	}

	if (numChannels < 1 || numChannels > 16) {
		throw new Error(`Invalid or missing AIFF channel count: ${numChannels}.`);
	}

	if (sampleRate < 1000 || sampleRate > 192000) {
		throw new Error(`Invalid or missing AIFF sample rate: ${sampleRate} Hz.`);
	}

	if (soundDataOffset < 0 || soundDataOffset > buffer.length) {
		throw new Error(
			"Invalid AIFF file: Missing or corrupted SSND sound chunk.",
		);
	}

	const soundBytes = buffer.subarray(
		soundDataOffset,
		Math.min(buffer.length, soundDataOffset + soundDataLength),
	);
	const soundView = new DataView(
		soundBytes.buffer,
		soundBytes.byteOffset,
		soundBytes.byteLength,
	);

	let samples: Int16Array;

	if (sampleSize === 8) {
		// 8-bit signed PCM
		samples = new Int16Array(soundBytes.length);
		const signedView = new Int8Array(
			soundBytes.buffer,
			soundBytes.byteOffset,
			soundBytes.byteLength,
		);
		for (let i = 0; i < soundBytes.length; i++) {
			samples[i] = (signedView[i] ?? 0) << 8;
		}
	} else if (sampleSize === 16) {
		// 16-bit signed PCM Big-Endian
		const count = Math.floor(soundBytes.length / 2);
		samples = new Int16Array(count);
		for (let i = 0; i < count; i++) {
			samples[i] = soundView.getInt16(i * 2, false);
		}
	} else if (sampleSize === 24) {
		// 24-bit signed PCM Big-Endian
		const count = Math.floor(soundBytes.length / 3);
		samples = new Int16Array(count);
		for (let i = 0; i < count; i++) {
			const b0 = soundBytes[i * 3] ?? 0;
			const b1 = soundBytes[i * 3 + 1] ?? 0;
			const b2 = soundBytes[i * 3 + 2] ?? 0;
			let val = (b0 << 16) | (b1 << 8) | b2;
			if (val & 0x800000) val |= ~0xffffff;
			samples[i] = Math.max(-32768, Math.min(32767, val >> 8));
		}
	} else if (sampleSize === 32) {
		// 32-bit signed PCM Big-Endian
		const count = Math.floor(soundBytes.length / 4);
		samples = new Int16Array(count);
		for (let i = 0; i < count; i++) {
			const val = soundView.getInt32(i * 4, false);
			samples[i] = Math.max(-32768, Math.min(32767, val >> 16));
		}
	} else {
		throw new Error(`Unsupported AIFF sample bit depth: ${sampleSize}-bit.`);
	}

	const durationSeconds = sampleRate > 0 ? numSampleFrames / sampleRate : 0;
	const wavBytes = encodePcmToWav(numChannels, sampleRate, samples);

	return {
		numChannels,
		sampleRate,
		sampleSize,
		numSampleFrames,
		durationSeconds,
		wavBytes,
	};
}

/**
 * Converts an AIFF buffer into a standard RIFF WAV ArrayBuffer.
 */
export function convertAiffToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Apple AIFF audio container");
	const uint8 = new Uint8Array(input);

	onProgress?.(0.5, "Parsing COMM chunk & unpacking Big-Endian PCM");
	const meta = parseAiff(uint8);

	onProgress?.(0.9, "Synthesizing universal RIFF WAV audio");
	return meta.wavBytes.buffer.slice(
		meta.wavBytes.byteOffset,
		meta.wavBytes.byteOffset + meta.wavBytes.byteLength,
	) as ArrayBuffer;
}
