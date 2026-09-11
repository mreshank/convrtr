import type { DspConversionResult, DspHeader, DspMetadata } from "./types";

/**
 * Parses and decodes a Nintendo GameCube / Wii DSP ADPCM (.dsp) audio file
 * into a standard 16-bit Linear PCM RIFF WAV audio file.
 */
export function convertDspToWav(
	input: Uint8Array | ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): DspConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 96) {
		throw new Error(
			"Invalid DSP file: File size is smaller than the minimum 96-byte header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Read big-endian header fields
	const numSamples = view.getUint32(0, false);
	const numNibbles = view.getUint32(4, false);
	const sampleRate = view.getUint32(8, false);
	const loopFlag = view.getUint16(12, false) !== 0;
	const format = view.getUint16(14, false);
	const loopStart = view.getUint32(16, false);
	const loopEnd = view.getUint32(20, false);

	if (sampleRate === 0 || sampleRate > 192000) {
		throw new Error(
			`Invalid DSP sample rate (${sampleRate} Hz): Expected value between 8000 and 192000 Hz.`,
		);
	}

	if (numSamples === 0) {
		throw new Error("Invalid DSP file: Sample count is 0.");
	}

	// Read 16 signed 16-bit predictor coefficients
	const coefficients: number[] = [];
	for (let i = 0; i < 16; i++) {
		coefficients.push(view.getInt16(28 + i * 2, false));
	}

	const initialHist1 = view.getInt16(64, false);
	const initialHist2 = view.getInt16(66, false);

	const dspHeader: DspHeader = {
		numSamples,
		numNibbles,
		sampleRate,
		loopFlag,
		format,
		loopStart,
		loopEnd,
		coefficients,
		initialHist1,
		initialHist2,
	};

	onProgress?.(0.2, "DECODE_ADPCM");

	// Allocate decoded sample array (16-bit PCM mono)
	const decodedSamples = new Int16Array(numSamples);
	let hist1 = initialHist1;
	let hist2 = initialHist2;
	let sampleIndex = 0;

	let offset = 96;
	const totalBytes = bytes.length;

	// Process 8-byte frames
	while (offset < totalBytes && sampleIndex < numSamples) {
		const headerByte = bytes[offset] ?? 0;
		const predictorIndex = (headerByte >> 4) & 0x07; // 0..7
		const scaleExponent = headerByte & 0x0f; // 0..15
		const scale = 1 << scaleExponent;

		const c1 = coefficients[predictorIndex * 2] ?? 0;
		const c2 = coefficients[predictorIndex * 2 + 1] ?? 0;

		offset++;

		// 7 data bytes -> 14 nibbles
		for (let byteIdx = 0; byteIdx < 7 && offset < totalBytes; byteIdx++) {
			const b = bytes[offset] ?? 0;
			offset++;

			// High nibble
			const rawHigh = (b >> 4) & 0x0f;
			const dHigh = rawHigh >= 8 ? rawHigh - 16 : rawHigh;

			const sampleHigh =
				((dHigh * scale) << 11) + 1024 + c1 * hist1 + c2 * hist2;
			let pcmHigh = sampleHigh >> 11;
			if (pcmHigh > 32767) pcmHigh = 32767;
			else if (pcmHigh < -32768) pcmHigh = -32768;

			hist2 = hist1;
			hist1 = pcmHigh;

			if (sampleIndex < numSamples) {
				decodedSamples[sampleIndex++] = pcmHigh;
			}

			// Low nibble
			const rawLow = b & 0x0f;
			const dLow = rawLow >= 8 ? rawLow - 16 : rawLow;

			const sampleLow = ((dLow * scale) << 11) + 1024 + c1 * hist1 + c2 * hist2;
			let pcmLow = sampleLow >> 11;
			if (pcmLow > 32767) pcmLow = 32767;
			else if (pcmLow < -32768) pcmLow = -32768;

			hist2 = hist1;
			hist1 = pcmLow;

			if (sampleIndex < numSamples) {
				decodedSamples[sampleIndex++] = pcmLow;
			}
		}

		if (sampleIndex % 8000 === 0) {
			onProgress?.(0.2 + (sampleIndex / numSamples) * 0.7, "DECODING_SAMPLES");
		}
	}

	onProgress?.(0.9, "BUILD_WAV");

	// Build 44-byte standard RIFF WAV header
	const numChannels = 1;
	const bytesPerSample = 2; // 16-bit
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const actualSampleCount = sampleIndex;
	const dataBytesLen = actualSampleCount * bytesPerSample;
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
	wavView.setUint16(20, 1, true); // AudioFormat = 1 (Linear PCM)
	wavView.setUint16(22, numChannels, true);
	wavView.setUint32(24, sampleRate, true);
	wavView.setUint32(28, byteRate, true);
	wavView.setUint16(32, blockAlign, true);
	wavView.setUint16(34, 16, true); // 16-bit

	// "data"
	wavBuffer[36] = 0x64;
	wavBuffer[37] = 0x61;
	wavBuffer[38] = 0x74;
	wavBuffer[39] = 0x61;
	wavView.setUint32(40, dataBytesLen, true);

	// Write 16-bit little-endian samples
	let wavOffset = 44;
	for (let i = 0; i < actualSampleCount; i++) {
		wavView.setInt16(wavOffset, decodedSamples[i] ?? 0, true);
		wavOffset += 2;
	}

	const durationMs = Math.round((actualSampleCount / sampleRate) * 1000);

	const metadata: DspMetadata = {
		sampleRate,
		channels: numChannels,
		sampleCount: actualSampleCount,
		durationMs,
		looping: loopFlag,
		header: dspHeader,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
