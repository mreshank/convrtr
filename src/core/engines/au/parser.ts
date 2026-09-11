/**
 * Sun Microsystems / NeXT AU (.au / .snd) Audio Decoder and RIFF WAV Converter.
 *
 * Decodes G.711 mu-law, A-law, 8-bit signed PCM, 16-bit/24-bit/32-bit Big-Endian PCM,
 * and 32-bit IEEE float into universal 16-bit linear PCM RIFF WAV format.
 */

export interface AuMetadata {
	magic: string;
	dataOffset: number;
	dataSize: number;
	encoding: number;
	encodingName: string;
	sampleRate: number;
	channels: number;
	info: string;
	totalSamples: number;
	durationSeconds: number;
	wavBytes: Uint8Array;
}

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

const ENCODING_NAMES: Record<number, string> = {
	1: "8-bit G.711 mu-law",
	2: "8-bit signed linear PCM",
	3: "16-bit signed linear PCM",
	4: "24-bit signed linear PCM",
	5: "32-bit signed linear PCM",
	6: "32-bit IEEE floating-point",
	7: "64-bit IEEE floating-point",
	27: "8-bit G.711 A-law",
};

/**
 * Wraps 16-bit linear PCM samples into a standard 44-byte RIFF WAVE container.
 */
export function encodePcmToWav(
	channels: number,
	sampleRate: number,
	int16Samples: Int16Array,
): Uint8Array {
	const dataLength = int16Samples.length * 2;
	const buffer = new Uint8Array(44 + dataLength);
	const view = new DataView(buffer.buffer);

	// "RIFF"
	buffer[0] = 0x52;
	buffer[1] = 0x49;
	buffer[2] = 0x46;
	buffer[3] = 0x46;
	view.setUint32(4, 36 + dataLength, true);
	// "WAVE"
	buffer[8] = 0x57;
	buffer[9] = 0x41;
	buffer[10] = 0x56;
	buffer[11] = 0x45;

	// "fmt " chunk
	buffer[12] = 0x66;
	buffer[13] = 0x6d;
	buffer[14] = 0x74;
	buffer[15] = 0x20;
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // Linear PCM
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 2, true); // Byte rate
	view.setUint16(32, channels * 2, true); // Block align
	view.setUint16(34, 16, true); // 16 bits per sample

	// "data" chunk
	buffer[36] = 0x64;
	buffer[37] = 0x61;
	buffer[38] = 0x74;
	buffer[39] = 0x61;
	view.setUint32(40, dataLength, true);

	for (let i = 0; i < int16Samples.length; i++) {
		view.setInt16(44 + i * 2, int16Samples[i] ?? 0, true);
	}

	return buffer;
}

/**
 * Parses an AU / SND file and decodes all samples to standard WAV.
 */
export function parseAu(buffer: Uint8Array): AuMetadata {
	if (buffer.length < 24) {
		throw new Error(
			"Invalid AU file: Buffer size is smaller than the 24-byte AU header.",
		);
	}

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	// Validate magic: 0x2E 0x73 0x6E 0x64 (".snd")
	const magic0 = buffer[0];
	const magic1 = buffer[1];
	const magic2 = buffer[2];
	const magic3 = buffer[3];
	if (
		magic0 !== 0x2e ||
		magic1 !== 0x73 ||
		magic2 !== 0x6e ||
		magic3 !== 0x64
	) {
		throw new Error(
			`Invalid AU signature: Expected '.snd', received '${String.fromCharCode(
				magic0 ?? 0,
				magic1 ?? 0,
				magic2 ?? 0,
				magic3 ?? 0,
			)}'.`,
		);
	}

	const dataOffset = view.getUint32(4, false); // big-endian
	const dataSizeField = view.getUint32(8, false);
	const encoding = view.getUint32(12, false);
	const sampleRate = view.getUint32(16, false);
	const channels = view.getUint32(20, false);

	if (dataOffset < 24 || dataOffset > buffer.length) {
		throw new Error(
			`Invalid AU header: Data offset (${dataOffset}) is out of bounds.`,
		);
	}

	if (channels < 1 || channels > 16) {
		throw new Error(`Unsupported AU channel count: ${channels}.`);
	}

	if (sampleRate < 1000 || sampleRate > 192000) {
		throw new Error(`Invalid or corrupted AU sample rate: ${sampleRate} Hz.`);
	}

	// Extract optional ASCII info string between byte 24 and dataOffset
	let info = "";
	if (dataOffset > 24) {
		const infoBytes = buffer.subarray(24, dataOffset);
		const nullIndex = infoBytes.indexOf(0);
		const validBytes =
			nullIndex >= 0 ? infoBytes.subarray(0, nullIndex) : infoBytes;
		info = new TextDecoder("latin1").decode(validBytes).trim();
	}

	const audioBytes =
		dataSizeField !== 0xffffffff && dataOffset + dataSizeField <= buffer.length
			? buffer.subarray(dataOffset, dataOffset + dataSizeField)
			: buffer.subarray(dataOffset);

	const encodingName =
		ENCODING_NAMES[encoding] ?? `Custom encoding (${encoding})`;

	let samples: Int16Array;

	switch (encoding) {
		case 1: {
			// 8-bit G.711 mu-law
			samples = new Int16Array(audioBytes.length);
			for (let i = 0; i < audioBytes.length; i++) {
				samples[i] = ULAW_TABLE[audioBytes[i] ?? 0] ?? 0;
			}
			break;
		}

		case 2: {
			// 8-bit signed linear PCM
			samples = new Int16Array(audioBytes.length);
			const signedView = new Int8Array(
				audioBytes.buffer,
				audioBytes.byteOffset,
				audioBytes.byteLength,
			);
			for (let i = 0; i < audioBytes.length; i++) {
				samples[i] = (signedView[i] ?? 0) << 8;
			}
			break;
		}

		case 3: {
			// 16-bit linear PCM Big-Endian
			const sampleCount = Math.floor(audioBytes.length / 2);
			samples = new Int16Array(sampleCount);
			const audioView = new DataView(
				audioBytes.buffer,
				audioBytes.byteOffset,
				audioBytes.byteLength,
			);
			for (let i = 0; i < sampleCount; i++) {
				samples[i] = audioView.getInt16(i * 2, false); // big-endian
			}
			break;
		}

		case 4: {
			// 24-bit linear PCM Big-Endian
			const sampleCount = Math.floor(audioBytes.length / 3);
			samples = new Int16Array(sampleCount);
			for (let i = 0; i < sampleCount; i++) {
				const b0 = audioBytes[i * 3] ?? 0;
				const b1 = audioBytes[i * 3 + 1] ?? 0;
				const b2 = audioBytes[i * 3 + 2] ?? 0;
				let val = (b0 << 16) | (b1 << 8) | b2;
				if (val & 0x800000) val |= ~0xffffff;
				samples[i] = Math.max(-32768, Math.min(32767, val >> 8));
			}
			break;
		}

		case 5: {
			// 32-bit linear PCM Big-Endian
			const sampleCount = Math.floor(audioBytes.length / 4);
			samples = new Int16Array(sampleCount);
			const audioView = new DataView(
				audioBytes.buffer,
				audioBytes.byteOffset,
				audioBytes.byteLength,
			);
			for (let i = 0; i < sampleCount; i++) {
				const val = audioView.getInt32(i * 4, false);
				samples[i] = Math.max(-32768, Math.min(32767, val >> 16));
			}
			break;
		}

		case 6: {
			// 32-bit IEEE float Big-Endian
			const sampleCount = Math.floor(audioBytes.length / 4);
			samples = new Int16Array(sampleCount);
			const audioView = new DataView(
				audioBytes.buffer,
				audioBytes.byteOffset,
				audioBytes.byteLength,
			);
			for (let i = 0; i < sampleCount; i++) {
				const f = audioView.getFloat32(i * 4, false);
				const clamped = Math.max(-1.0, Math.min(1.0, f));
				samples[i] = Math.round(clamped * 32767);
			}
			break;
		}

		case 27: {
			// 8-bit G.711 A-law
			samples = new Int16Array(audioBytes.length);
			for (let i = 0; i < audioBytes.length; i++) {
				samples[i] = ALAW_TABLE[audioBytes[i] ?? 0] ?? 0;
			}
			break;
		}

		default:
			throw new Error(`Unsupported AU audio encoding format: ${encoding}.`);
	}

	const totalSamples = Math.floor(samples.length / channels);
	const durationSeconds = sampleRate > 0 ? totalSamples / sampleRate : 0;
	const wavBytes = encodePcmToWav(channels, sampleRate, samples);

	return {
		magic: ".snd",
		dataOffset,
		dataSize: audioBytes.length,
		encoding,
		encodingName,
		sampleRate,
		channels,
		info,
		totalSamples,
		durationSeconds,
		wavBytes,
	};
}

/**
 * Converts an AU buffer into a standard RIFF WAV ArrayBuffer.
 */
export function convertAuToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Sun/NeXT AU audio header");
	const uint8 = new Uint8Array(input);

	onProgress?.(0.5, "Decoding audio stream to 16-bit linear PCM");
	const meta = parseAu(uint8);

	onProgress?.(0.9, "Synthesizing RIFF WAVE audio container");
	return meta.wavBytes.buffer.slice(
		meta.wavBytes.byteOffset,
		meta.wavBytes.byteOffset + meta.wavBytes.byteLength,
	) as ArrayBuffer;
}
