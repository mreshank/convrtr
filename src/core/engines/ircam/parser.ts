import {
	IRCAM_CODE_16BIT_PCM,
	IRCAM_CODE_32BIT_FLOAT,
	IRCAM_CODE_32BIT_PCM,
	IRCAM_CODE_MULAW,
	IRCAM_HEADER_SIZE,
	type IrcamHeader,
} from "./types";

// Pre-computed lookup table for 8-bit mu-law to 16-bit linear PCM
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

/**
 * Builds standard 44-byte little-endian RIFF WAVE container with 16-bit PCM audio.
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

	// "fmt " chunk
	u8[12] = 0x66;
	u8[13] = 0x6d;
	u8[14] = 0x74;
	u8[15] = 0x20;
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // Linear PCM
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 2, true); // Byte rate
	view.setUint16(32, channels * 2, true); // Block align
	view.setUint16(34, 16, true); // 16 bits per sample

	// "data" chunk
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
 * Validates and extracts header metadata from an IRCAM sound file.
 */
export function parseIrcamHeader(buffer: Uint8Array): IrcamHeader {
	if (buffer.length < IRCAM_HEADER_SIZE) {
		throw new Error(
			`Invalid IRCAM file: header size must be at least ${IRCAM_HEADER_SIZE} bytes (got ${buffer.length})`,
		);
	}

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	const b0 = buffer[0] ?? 0;
	const b1 = buffer[1] ?? 0;
	const b2 = buffer[2] ?? 0;
	const b3 = buffer[3] ?? 0;

	let isLittleEndian = false;
	let recognized = false;

	if (b0 === 0x64 && b1 === 0xa3) {
		// Big-endian Sun/NeXT/SGI
		isLittleEndian = false;
		recognized = true;
	} else if (b2 === 0xa3 && b3 === 0x64) {
		// Little-endian VAX / DEC MIPS
		isLittleEndian = true;
		recognized = true;
	} else if (b0 === 0xa3 && b1 === 0x64) {
		// Little-endian variant
		isLittleEndian = true;
		recognized = true;
	}

	if (!recognized) {
		throw new Error(
			`Invalid IRCAM file: magic bytes [0x${b0.toString(16)}, 0x${b1.toString(16)}, 0x${b2.toString(16)}, 0x${b3.toString(16)}] not recognized`,
		);
	}

	// Sample Rate is stored at offset 4 as 32-bit float
	let rawSampleRate = view.getFloat32(4, isLittleEndian);
	if (
		Number.isNaN(rawSampleRate) ||
		rawSampleRate <= 1000 ||
		rawSampleRate > 384000
	) {
		// Try reading as uint32 integer
		const uintRate = view.getUint32(4, isLittleEndian);
		if (uintRate >= 4000 && uintRate <= 384000) {
			rawSampleRate = uintRate;
		} else {
			rawSampleRate = 44100;
		}
	}
	const sampleRate = Math.round(rawSampleRate);

	// Channels at offset 8 as uint32
	let channels = view.getUint32(8, isLittleEndian);
	if (channels < 1 || channels > 32) {
		channels = 1;
	}

	// Encoding at offset 12 as uint32
	let encoding = view.getUint32(12, isLittleEndian);
	let encodingName = "16-bit linear PCM";

	if (encoding === IRCAM_CODE_32BIT_FLOAT) {
		encodingName = "32-bit IEEE float";
	} else if (encoding === IRCAM_CODE_32BIT_PCM) {
		encodingName = "32-bit linear PCM";
	} else if (encoding === IRCAM_CODE_MULAW) {
		encodingName = "8-bit mu-law";
	} else if (encoding !== IRCAM_CODE_16BIT_PCM) {
		// Fallback: default to 16-bit PCM
		encoding = IRCAM_CODE_16BIT_PCM;
		encodingName = "16-bit linear PCM";
	}

	const audioBytes = Math.max(0, buffer.length - IRCAM_HEADER_SIZE);
	let bytesPerSample = 2;
	if (
		encoding === IRCAM_CODE_32BIT_FLOAT ||
		encoding === IRCAM_CODE_32BIT_PCM
	) {
		bytesPerSample = 4;
	} else if (encoding === IRCAM_CODE_MULAW) {
		bytesPerSample = 1;
	}

	const totalSamples = Math.floor(audioBytes / bytesPerSample);
	const durationSeconds =
		channels > 0 && sampleRate > 0 ? totalSamples / channels / sampleRate : 0;

	return {
		isLittleEndian,
		sampleRate,
		channels,
		encoding,
		encodingName,
		dataOffset: IRCAM_HEADER_SIZE,
		totalSamples,
		durationSeconds,
	};
}

/**
 * Converts IRCAM / Sound Designer II audio buffer into standard 16-bit PCM WAV.
 */
export function convertIrcamToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading IRCAM header");

	const u8 = new Uint8Array(input);
	const header = parseIrcamHeader(u8);
	const { isLittleEndian, sampleRate, channels, encoding, dataOffset } = header;

	const audioLength = u8.length - dataOffset;
	if (audioLength <= 0) {
		throw new Error("Invalid IRCAM file: no audio sample payload present");
	}

	onProgress?.(0.3, `Decoding ${header.encodingName}`);

	const view = new DataView(input, dataOffset);
	let int16Samples: Int16Array;

	if (encoding === IRCAM_CODE_32BIT_FLOAT) {
		const numSamples = Math.floor(audioLength / 4);
		int16Samples = new Int16Array(numSamples);

		for (let i = 0; i < numSamples; i++) {
			const fVal = view.getFloat32(i * 4, isLittleEndian);
			const clamped = Math.max(
				-1.0,
				Math.min(1.0, Number.isNaN(fVal) ? 0 : fVal),
			);
			const scaled =
				clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
			int16Samples[i] = Math.max(-32768, Math.min(32767, scaled));
		}
	} else if (encoding === IRCAM_CODE_32BIT_PCM) {
		const numSamples = Math.floor(audioLength / 4);
		int16Samples = new Int16Array(numSamples);

		for (let i = 0; i < numSamples; i++) {
			const val32 = view.getInt32(i * 4, isLittleEndian);
			int16Samples[i] = Math.max(-32768, Math.min(32767, val32 >> 16));
		}
	} else if (encoding === IRCAM_CODE_MULAW) {
		const numSamples = audioLength;
		int16Samples = new Int16Array(numSamples);

		for (let i = 0; i < numSamples; i++) {
			const byteVal = u8[dataOffset + i] ?? 0;
			int16Samples[i] = ULAW_TABLE[byteVal] ?? 0;
		}
	} else {
		// 16-bit signed PCM
		const numSamples = Math.floor(audioLength / 2);
		int16Samples = new Int16Array(numSamples);

		for (let i = 0; i < numSamples; i++) {
			int16Samples[i] = view.getInt16(i * 2, isLittleEndian);
		}
	}

	onProgress?.(0.8, "Synthesizing RIFF WAV container");
	const wavBuffer = createWavBuffer(int16Samples, sampleRate, channels);

	onProgress?.(1.0, "Complete");
	return wavBuffer;
}
