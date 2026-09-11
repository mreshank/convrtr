import type {
	UlawConversionResult,
	UlawMetadata,
	UlawToWavOptions,
} from "./types";

/**
 * Pre-computed G.711 mu-law to 16-bit linear PCM lookup table (256 entries).
 */
export const MULAW_TO_PCM16 = new Int16Array(256);
for (let i = 0; i < 256; i++) {
	const inverted = ~i & 0xff;
	const sign = inverted & 0x80 ? -1 : 1;
	const exponent = (inverted >> 4) & 0x07;
	const mantissa = inverted & 0x0f;
	const magnitude = ((mantissa << 3) + 0x84) << exponent;
	const pcm = sign * (magnitude - 0x84);
	MULAW_TO_PCM16[i] = Math.max(-32768, Math.min(32767, pcm));
}

/**
 * Pre-computed G.711 A-law to 16-bit linear PCM lookup table (256 entries).
 */
export const ALAW_TO_PCM16 = new Int16Array(256);
for (let i = 0; i < 256; i++) {
	const toggled = i ^ 0x55;
	const sign = toggled & 0x80 ? -1 : 1;
	const exponent = (toggled >> 4) & 0x07;
	const mantissa = toggled & 0x0f;
	let magnitude = 0;
	if (exponent === 0) {
		magnitude = (mantissa << 4) + 8;
	} else {
		magnitude = ((mantissa << 4) + 0x108) << (exponent - 1);
	}
	const pcm = sign * magnitude;
	ALAW_TO_PCM16[i] = Math.max(-32768, Math.min(32767, pcm));
}

/**
 * Parses and decodes raw G.711 mu-law or A-law headerless telephony audio into
 * standard 16-bit linear PCM RIFF WAV format.
 */
export function convertUlawToWav(
	input: Uint8Array | ArrayBuffer,
	options: UlawToWavOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): UlawConversionResult {
	onProgress?.(0.05, "READ_INPUT");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length === 0) {
		throw new Error("Invalid audio file: Input data is empty.");
	}

	const sampleRate =
		options.sampleRate && options.sampleRate > 0
			? Math.min(Math.max(options.sampleRate, 1000), 192000)
			: 8000;

	const codecType = options.codec === "alaw" ? "alaw" : "mulaw";
	const lookupTable = codecType === "alaw" ? ALAW_TO_PCM16 : MULAW_TO_PCM16;

	onProgress?.(0.2, "DECODE_PCM");

	const sampleCount = bytes.length;
	const pcmSamples = new Int16Array(sampleCount);

	for (let i = 0; i < sampleCount; i++) {
		const rawByte = bytes[i] ?? 0;
		pcmSamples[i] = lookupTable[rawByte] ?? 0;

		if (i % 8192 === 0 && onProgress) {
			onProgress(0.2 + (i / sampleCount) * 0.65, "DECODING_AUDIO");
		}
	}

	onProgress?.(0.9, "BUILD_WAV");

	// Standard 44-byte RIFF WAV container
	const numChannels = 1;
	const bytesPerSample = 2; // 16-bit
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataBytesLen = sampleCount * bytesPerSample;
	const wavTotalLen = 44 + dataBytesLen;

	const wavBuffer = new Uint8Array(wavTotalLen);
	const wavView = new DataView(wavBuffer.buffer);

	// "RIFF"
	wavBuffer[0] = 0x52;
	wavBuffer[1] = 0x49;
	wavBuffer[2] = 0x46;
	wavBuffer[3] = 0x46;
	wavView.setUint32(4, wavTotalLen - 8, true);

	// "WAVE"
	wavBuffer[8] = 0x57;
	wavBuffer[9] = 0x41;
	wavBuffer[10] = 0x56;
	wavBuffer[11] = 0x45;

	// "fmt "
	wavBuffer[12] = 0x66;
	wavBuffer[13] = 0x6d;
	wavBuffer[14] = 0x74;
	wavBuffer[15] = 0x20;
	wavView.setUint32(16, 16, true); // Subchunk1Size
	wavView.setUint16(20, 1, true); // Linear PCM
	wavView.setUint16(22, numChannels, true);
	wavView.setUint32(24, sampleRate, true);
	wavView.setUint32(28, byteRate, true);
	wavView.setUint16(32, blockAlign, true);
	wavView.setUint16(34, 16, true); // 16 bits per sample

	// "data"
	wavBuffer[36] = 0x64;
	wavBuffer[37] = 0x61;
	wavBuffer[38] = 0x74;
	wavBuffer[39] = 0x61;
	wavView.setUint32(40, dataBytesLen, true);

	// Copy 16-bit PCM little-endian samples
	let offset = 44;
	for (let i = 0; i < sampleCount; i++) {
		wavView.setInt16(offset, pcmSamples[i] ?? 0, true);
		offset += 2;
	}

	const durationMs = Math.round((sampleCount / sampleRate) * 1000);

	const metadata: UlawMetadata = {
		sampleRate,
		channels: numChannels,
		sampleCount,
		durationMs,
		codec: codecType === "alaw" ? "G.711 A-law" : "G.711 mu-law",
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
