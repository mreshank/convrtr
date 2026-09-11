import type { NistHeader } from "./types";

// Pre-computed lookup tables for G.711 mu-law and A-law
const ULAW_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
	const inverted = ~i & 0xff;
	const sign = inverted & 0x80;
	const exponent = (inverted >> 4) & 0x07;
	const mantissa = inverted & 0x0f;
	let sample = ((mantissa << 3) + 0x84) << exponent;
	sample -= 0x84;
	ULAW_TABLE[i] = sign !== 0 ? -sample : sample;
}

const ALAW_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
	const toggled = i ^ 0x55;
	const sign = toggled & 0x80;
	const exponent = (toggled & 0x70) >> 4;
	const mantissa = toggled & 0x0f;
	let sample = 0;
	if (exponent === 0) {
		sample = (mantissa << 4) + 8;
	} else {
		sample = ((mantissa << 4) + 0x108) << (exponent - 1);
	}
	ALAW_TABLE[i] = sign !== 0 ? sample : -sample;
}

/**
 * Builds standard 44-byte little-endian RIFF WAVE container.
 */
function createWavBuffer(
	int16Samples: Int16Array,
	sampleRate: number,
	channels: number,
): ArrayBuffer {
	const dataLength = int16Samples.length * 2;
	const totalSize = 44 + dataLength;
	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// "RIFF"
	u8[0] = 0x52;
	u8[1] = 0x49;
	u8[2] = 0x46;
	u8[3] = 0x46;
	view.setUint32(4, 36 + dataLength, true);

	// "WAVE"
	u8[8] = 0x57;
	u8[9] = 0x41;
	u8[10] = 0x56;
	u8[11] = 0x45;

	// "fmt "
	u8[12] = 0x66;
	u8[13] = 0x6d;
	u8[14] = 0x74;
	u8[15] = 0x20;
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // Linear PCM
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 2, true);
	view.setUint16(32, channels * 2, true);
	view.setUint16(34, 16, true); // 16 bits per sample

	// "data"
	u8[36] = 0x64;
	u8[37] = 0x61;
	u8[38] = 0x74;
	u8[39] = 0x61;
	view.setUint32(40, dataLength, true);

	for (let i = 0; i < int16Samples.length; i++) {
		view.setInt16(44 + i * 2, int16Samples[i] ?? 0, true);
	}

	return buffer;
}

/**
 * Parses NIST SPHERE text header.
 */
export function parseNistHeader(buffer: Uint8Array): NistHeader {
	if (buffer.length < 16) {
		throw new Error("Invalid NIST SPHERE file: Buffer is too small");
	}

	const decoder = new TextDecoder("ascii");
	// NIST header typically 1024 bytes
	const previewText = decoder.decode(
		buffer.subarray(0, Math.min(buffer.length, 4096)),
	);

	if (!previewText.startsWith("NIST_1A")) {
		throw new Error("Invalid NIST SPHERE file: Missing NIST_1A magic header");
	}

	const lines = previewText.split(/\r?\n/);
	const line1 = lines[1]?.trim() ?? "1024";
	let headerSize = Number.parseInt(line1, 10);
	if (Number.isNaN(headerSize) || headerSize <= 0) {
		headerSize = 1024;
	}

	let channels = 1;
	let sampleRate = 16000;
	let bytesPerSample = 2;
	let byteFormat = "01"; // little-endian default
	let coding = "pcm";
	let sampleCount = 0;

	for (let i = 2; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line || line === "end_head") break;

		// Format: <field_name> -<type><len?> <value>
		const match = line.match(/^([a-zA-Z0-9_]+)\s+-[a-zA-Z0-9]+\s+(.*)$/);
		if (!match) continue;

		const field = match[1]?.toLowerCase();
		const val = match[2]?.trim();
		if (!field || !val) continue;

		if (field === "channel_count") {
			const n = Number.parseInt(val, 10);
			if (!Number.isNaN(n) && n > 0) channels = n;
		} else if (field === "sample_rate") {
			const sr = Number.parseInt(val, 10);
			if (!Number.isNaN(sr) && sr > 0) sampleRate = sr;
		} else if (field === "sample_n_bytes") {
			const nb = Number.parseInt(val, 10);
			if (!Number.isNaN(nb) && nb > 0) bytesPerSample = nb;
		} else if (field === "sample_byte_format") {
			byteFormat = val.toLowerCase();
		} else if (field === "sample_coding") {
			coding = val.toLowerCase();
		} else if (field === "sample_count") {
			const sc = Number.parseInt(val, 10);
			if (!Number.isNaN(sc) && sc >= 0) sampleCount = sc;
		}
	}

	return {
		headerSize,
		channels,
		sampleRate,
		bytesPerSample,
		byteFormat,
		coding,
		sampleCount,
	};
}

/**
 * Converts NIST SPHERE (.sph, .nist) audio into standard 16-bit linear PCM WAV.
 */
export function convertNistToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading NIST SPHERE header");

	const u8 = new Uint8Array(input);
	const header = parseNistHeader(u8);
	const {
		headerSize,
		channels,
		sampleRate,
		bytesPerSample,
		byteFormat,
		coding,
	} = header;

	const audioLength = Math.max(0, u8.length - headerSize);
	if (audioLength <= 0) {
		throw new Error("Invalid NIST SPHERE file: No audio sample data present");
	}

	onProgress?.(0.3, `Decoding ${coding.toUpperCase()} audio samples`);

	const isLittleEndian = !(
		byteFormat.startsWith("10") ||
		byteFormat.includes("big") ||
		byteFormat === "be"
	);

	const view = new DataView(input, headerSize);
	let int16Samples: Int16Array;

	if (coding.includes("ulaw") || coding.includes("mu-law")) {
		const numSamples = audioLength;
		int16Samples = new Int16Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			const b = u8[headerSize + i] ?? 0;
			int16Samples[i] = ULAW_TABLE[b] ?? 0;
		}
	} else if (coding.includes("alaw") || coding.includes("a-law")) {
		const numSamples = audioLength;
		int16Samples = new Int16Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			const b = u8[headerSize + i] ?? 0;
			int16Samples[i] = ALAW_TABLE[b] ?? 0;
		}
	} else if (bytesPerSample === 1) {
		// 8-bit unsigned PCM
		const numSamples = audioLength;
		int16Samples = new Int16Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			const b = u8[headerSize + i] ?? 128;
			int16Samples[i] = (b - 128) << 8;
		}
	} else {
		// 16-bit linear PCM
		const numSamples = Math.floor(audioLength / 2);
		int16Samples = new Int16Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			int16Samples[i] = view.getInt16(i * 2, isLittleEndian);
		}
	}

	onProgress?.(0.8, "Synthesizing RIFF WAVE container");
	const wavBuffer = createWavBuffer(int16Samples, sampleRate, channels);

	onProgress?.(1.0, "Complete");
	return wavBuffer;
}
