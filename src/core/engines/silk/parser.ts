import { decode, isSilk } from "silk-wasm";

export interface SilkMetadata {
	sampleRate: number;
	channels: number;
	durationMs: number;
	wavBytes: Uint8Array;
}

const SILK_HEADER_MAGIC = new Uint8Array([
	0x23,
	0x21,
	0x53,
	0x49,
	0x4c,
	0x4b,
	0x5f,
	0x56,
	0x33, // "#!SILK_V3"
]);

/**
 * Normalizes a WeChat, Skype, or raw Silk v3 audio stream.
 * Strips WeChat's leading 0x02 byte or prepends the "#!SILK_V3" header if omitted.
 */
export function normalizeSilkBytes(rawBytes: Uint8Array): Uint8Array {
	if (rawBytes.length < 2) {
		throw new Error("Invalid Silk audio: File is too small.");
	}

	// 1. WeChat voice messages begin with 0x02 followed by "#!SILK_V3"
	if (rawBytes[0] === 0x02 && rawBytes.length >= 10) {
		let isWeChatHeader = true;
		for (let i = 0; i < SILK_HEADER_MAGIC.length; i++) {
			if (rawBytes[1 + i] !== SILK_HEADER_MAGIC[i]) {
				isWeChatHeader = false;
				break;
			}
		}
		if (isWeChatHeader) {
			return rawBytes;
		}
	}

	// 2. Standard Silk file starting with "#!SILK_V3" without 0x02 prefix: prepend 0x02
	if (isSilk(rawBytes)) {
		const withPrefix = new Uint8Array(1 + rawBytes.length);
		withPrefix[0] = 0x02;
		withPrefix.set(rawBytes, 1);
		return withPrefix;
	}

	// 3. Raw Silk frames without header: prepend 0x02 + "#!SILK_V3"
	const withHeader = new Uint8Array(
		1 + SILK_HEADER_MAGIC.length + rawBytes.length,
	);
	withHeader[0] = 0x02;
	withHeader.set(SILK_HEADER_MAGIC, 1);
	withHeader.set(rawBytes, 1 + SILK_HEADER_MAGIC.length);
	return withHeader;
}

/**
 * Synthesizes a standard 44-byte RIFF WAV container holding 16-bit linear PCM audio.
 */
export function createWavFromPcm(
	pcmBytes: Uint8Array,
	sampleRate = 24000,
	channels = 1,
): Uint8Array {
	const bitDepth = 16;
	const byteRate = (sampleRate * channels * bitDepth) / 8;
	const blockAlign = (channels * bitDepth) / 8;
	const wavHeader = new Uint8Array(44);
	const view = new DataView(wavHeader.buffer);

	// "RIFF" chunk descriptor
	wavHeader[0] = 0x52; // 'R'
	wavHeader[1] = 0x49; // 'I'
	wavHeader[2] = 0x46; // 'F'
	wavHeader[3] = 0x46; // 'F'
	view.setUint32(4, 36 + pcmBytes.length, true);

	// "WAVE" format
	wavHeader[8] = 0x57; // 'W'
	wavHeader[9] = 0x41; // 'A'
	wavHeader[10] = 0x56; // 'V'
	wavHeader[11] = 0x45; // 'E'

	// "fmt " subchunk
	wavHeader[12] = 0x66; // 'f'
	wavHeader[13] = 0x6d; // 'm'
	wavHeader[14] = 0x74; // 't'
	wavHeader[15] = 0x20; // ' '
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitDepth, true);

	// "data" subchunk
	wavHeader[36] = 0x64; // 'd'
	wavHeader[37] = 0x61; // 'a'
	wavHeader[38] = 0x74; // 't'
	wavHeader[39] = 0x61; // 'a'
	view.setUint32(40, pcmBytes.length, true);

	const fullWav = new Uint8Array(44 + pcmBytes.length);
	fullWav.set(wavHeader, 0);
	fullWav.set(pcmBytes, 44);
	return fullWav;
}

/**
 * Parses and decodes a Skype, WeChat, or QQ Silk v3 voice memo into a playable RIFF WAV file.
 */
export async function parseSilk(
	fileBytes: Uint8Array,
	sampleRate = 24000,
): Promise<SilkMetadata> {
	const normalized = normalizeSilkBytes(fileBytes);
	const decoded = await decode(normalized, sampleRate);

	if (decoded.data.length === 0) {
		throw new Error(
			"Failed to decode Silk v3 audio stream: Decoder returned empty PCM buffer.",
		);
	}

	const wavBytes = createWavFromPcm(decoded.data, sampleRate, 1);

	return {
		sampleRate,
		channels: 1,
		durationMs: decoded.duration,
		wavBytes,
	};
}

/**
 * Main conversion entry point for Silk v3 (.silk / .slk) to WAV conversion.
 */
export async function convertSilkToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<ArrayBuffer> {
	onProgress?.(0.1, "Normalizing Silk v3 header & framing...");
	const bytes = new Uint8Array(input);
	const parsed = await parseSilk(bytes, 24000);

	onProgress?.(
		0.6,
		`Decoded ${Math.round(parsed.durationMs)}ms Silk speech at ${parsed.sampleRate}Hz...`,
	);
	onProgress?.(0.9, "Synthesizing lossless 16-bit Linear PCM WAV audio...");

	onProgress?.(1.0, "Complete");
	return parsed.wavBytes.buffer.slice(
		parsed.wavBytes.byteOffset,
		parsed.wavBytes.byteOffset + parsed.wavBytes.byteLength,
	) as ArrayBuffer;
}
