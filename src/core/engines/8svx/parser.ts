import type {
	EightSvxConversionResult,
	EightSvxMetadata,
	EightSvxVoiceHeader,
} from "./types";

const FIBONACCI_DELTA = [
	-34, -21, -13, -8, -5, -3, -2, -1, 0, 1, 2, 3, 5, 8, 13, 21,
];

/**
 * Parses an Amiga IFF 8SVX audio file and converts it into a standard 16-bit linear PCM WAV.
 */
export function convert8svxToWav(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): EightSvxConversionResult {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 12) {
		throw new Error("Invalid IFF file: Buffer too small for FORM container.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// FORM magic (0x464F524D)
	const formMagic =
		String.fromCharCode(bytes[0] ?? 0) +
		String.fromCharCode(bytes[1] ?? 0) +
		String.fromCharCode(bytes[2] ?? 0) +
		String.fromCharCode(bytes[3] ?? 0);

	if (formMagic !== "FORM") {
		throw new Error("Invalid IFF file: Missing 'FORM' container magic.");
	}

	// Form type at offset 8: '8SVX'
	const formType =
		String.fromCharCode(bytes[8] ?? 0) +
		String.fromCharCode(bytes[9] ?? 0) +
		String.fromCharCode(bytes[10] ?? 0) +
		String.fromCharCode(bytes[11] ?? 0);

	if (formType !== "8SVX") {
		throw new Error(
			`Invalid 8SVX file: Form type is '${formType}', expected '8SVX'.`,
		);
	}

	onProgress?.(0.15, "SCAN_CHUNKS");

	let vhdr: EightSvxVoiceHeader | null = null;
	let name: string | undefined;
	let author: string | undefined;
	let annotation: string | undefined;
	let channels = 1;
	let bodyBytes: Uint8Array | null = null;

	let offset = 12;
	while (offset + 8 <= bytes.length) {
		const chunkId =
			String.fromCharCode(bytes[offset] ?? 0) +
			String.fromCharCode(bytes[offset + 1] ?? 0) +
			String.fromCharCode(bytes[offset + 2] ?? 0) +
			String.fromCharCode(bytes[offset + 3] ?? 0);

		const chunkSize = view.getUint32(offset + 4, false); // big-endian
		const chunkDataOffset = offset + 8;

		if (chunkDataOffset + chunkSize > bytes.length) {
			break;
		}

		if (chunkId === "VHDR" && chunkSize >= 20) {
			const oneShotHiSamples = view.getUint32(chunkDataOffset, false);
			const repeatHiSamples = view.getUint32(chunkDataOffset + 4, false);
			const samplesPerHiCycle = view.getUint32(chunkDataOffset + 8, false);
			const samplesPerSec = view.getUint16(chunkDataOffset + 12, false);
			const octaves = bytes[chunkDataOffset + 14] ?? 1;
			const compression = bytes[chunkDataOffset + 15] ?? 0;
			const volume = view.getInt32(chunkDataOffset + 16, false);

			vhdr = {
				oneShotHiSamples,
				repeatHiSamples,
				samplesPerHiCycle,
				samplesPerSec: samplesPerSec > 0 ? samplesPerSec : 22050,
				octaves,
				compression,
				volume,
			};
		} else if (chunkId === "CHAN" && chunkSize >= 4) {
			const chanMask = view.getUint32(chunkDataOffset, false);
			if (chanMask === 6) {
				channels = 2; // Stereo
			}
		} else if (chunkId === "NAME") {
			const rawStr = bytes.subarray(
				chunkDataOffset,
				chunkDataOffset + chunkSize,
			);
			name = new TextDecoder("utf-8").decode(rawStr).replace(/\0/g, "").trim();
		} else if (chunkId === "AUTH") {
			const rawStr = bytes.subarray(
				chunkDataOffset,
				chunkDataOffset + chunkSize,
			);
			author = new TextDecoder("utf-8")
				.decode(rawStr)
				.replace(/\0/g, "")
				.trim();
		} else if (chunkId === "ANNO") {
			const rawStr = bytes.subarray(
				chunkDataOffset,
				chunkDataOffset + chunkSize,
			);
			annotation = new TextDecoder("utf-8")
				.decode(rawStr)
				.replace(/\0/g, "")
				.trim();
		} else if (chunkId === "BODY") {
			bodyBytes = bytes.subarray(chunkDataOffset, chunkDataOffset + chunkSize);
		}

		// IFF chunks are 2-byte aligned
		const paddedSize = chunkSize + (chunkSize % 2);
		offset = chunkDataOffset + paddedSize;
	}

	if (!vhdr) {
		throw new Error(
			"Invalid 8SVX audio: Missing required 'VHDR' (Voice Header) chunk.",
		);
	}

	if (!bodyBytes || bodyBytes.length === 0) {
		throw new Error(
			"Invalid 8SVX audio: Missing or empty 'BODY' audio data chunk.",
		);
	}

	onProgress?.(0.4, "DECOMPRESS");

	// Decompress or unpack 8-bit samples
	const decodedSamples: Int16Array[] = [];
	const isFibonacci = vhdr.compression === 1;

	if (isFibonacci) {
		// Fibonacci-delta decompression
		// First two bytes are uncompressed initial sample values
		let currentVal =
			(bodyBytes[1] ?? 0) > 127
				? (bodyBytes[1] ?? 0) - 256
				: (bodyBytes[1] ?? 0);

		// Number of nibbles = (bodyBytes.length - 2) * 2
		const sampleCount = (bodyBytes.length - 2) * 2;
		const samples = new Int16Array(sampleCount);
		let sampleIdx = 0;

		for (let i = 2; i < bodyBytes.length; i++) {
			const byte = bodyBytes[i] ?? 0;
			const highNibble = (byte >> 4) & 0x0f;
			const lowNibble = byte & 0x0f;

			currentVal += FIBONACCI_DELTA[highNibble] ?? 0;
			currentVal = Math.max(-128, Math.min(127, currentVal));
			samples[sampleIdx++] = currentVal * 256;

			currentVal += FIBONACCI_DELTA[lowNibble] ?? 0;
			currentVal = Math.max(-128, Math.min(127, currentVal));
			samples[sampleIdx++] = currentVal * 256;
		}

		decodedSamples.push(samples);
	} else {
		// Uncompressed 8-bit signed PCM
		const sampleCount = bodyBytes.length;
		const samples = new Int16Array(sampleCount);

		for (let i = 0; i < sampleCount; i++) {
			const b = bodyBytes[i] ?? 0;
			const s8 = b > 127 ? b - 256 : b;
			samples[i] = s8 * 256;
		}

		decodedSamples.push(samples);
	}

	onProgress?.(0.7, "SYNTHESIZE_WAV");

	const primarySamples = decodedSamples[0] ?? new Int16Array(0);
	const sampleCount = primarySamples.length;
	const sampleRate = vhdr.samplesPerSec;
	const durationMs = Math.round((sampleCount / sampleRate) * 1000);

	// Construct RIFF WAVE
	const numChannels = channels;
	const bytesPerSample = 2; // 16-bit
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataBytesLen = sampleCount * bytesPerSample;
	const wavTotalLen = 44 + dataBytesLen;

	const wavBuffer = new Uint8Array(wavTotalLen);
	const wavView = new DataView(wavBuffer.buffer);

	// "RIFF"
	wavBuffer[0] = 0x52; // R
	wavBuffer[1] = 0x49; // I
	wavBuffer[2] = 0x46; // F
	wavBuffer[3] = 0x46; // F
	wavView.setUint32(4, wavTotalLen - 8, true);

	// "WAVE"
	wavBuffer[8] = 0x57; // W
	wavBuffer[9] = 0x41; // A
	wavBuffer[10] = 0x56; // V
	wavBuffer[11] = 0x45; // E

	// "fmt "
	wavBuffer[12] = 0x66; // f
	wavBuffer[13] = 0x6d; // m
	wavBuffer[14] = 0x74; // t
	wavBuffer[15] = 0x20; // ' '
	wavView.setUint32(16, 16, true); // Subchunk1Size
	wavView.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
	wavView.setUint16(22, numChannels, true);
	wavView.setUint32(24, sampleRate, true);
	wavView.setUint32(28, byteRate, true);
	wavView.setUint16(32, blockAlign, true);
	wavView.setUint16(34, 16, true); // 16-bit

	// "data"
	wavBuffer[36] = 0x64; // d
	wavBuffer[37] = 0x61; // a
	wavBuffer[38] = 0x74; // t
	wavBuffer[39] = 0x61; // a
	wavView.setUint32(40, dataBytesLen, true);

	// Write samples in 16-bit little endian
	let wavOffset = 44;
	for (let i = 0; i < sampleCount; i++) {
		const s = primarySamples[i] ?? 0;
		wavView.setInt16(wavOffset, s, true);
		wavOffset += 2;
	}

	onProgress?.(1.0, "COMPLETE");

	const metadata: EightSvxMetadata = {
		name,
		author,
		annotation,
		header: vhdr,
		channels: numChannels,
		sampleRate,
		durationMs,
		sampleCount,
	};

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
