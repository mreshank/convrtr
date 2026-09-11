import type {
	VoxConversionResult,
	VoxMetadata,
	VoxToWavOptions,
} from "./types";

/**
 * 49-entry step size table for Dialogic / OKI 4-bit ADPCM decompression.
 */
export const OKI_STEP_SIZE_TABLE = [
	16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88,
	97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408,
	449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552,
];

/**
 * Index table for step adjustment based on 4-bit nibble magnitude.
 */
export const OKI_INDEX_TABLE = [
	-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8,
];

/**
 * Parses and decodes a Dialogic / OKI ADPCM (.vox) audio stream into a standard
 * 16-bit linear PCM RIFF WAV audio file.
 */
export function convertVoxToWav(
	input: Uint8Array | ArrayBuffer,
	options: VoxToWavOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): VoxConversionResult {
	onProgress?.(0.05, "READ_INPUT");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length === 0) {
		throw new Error("Invalid VOX file: Input data is empty.");
	}

	const sampleRate =
		options.sampleRate && options.sampleRate > 0
			? Math.min(Math.max(options.sampleRate, 1000), 192000)
			: 8000;

	onProgress?.(0.15, "DECODE_ADPCM");

	const totalSamples = bytes.length * 2;
	const pcmSamples = new Int16Array(totalSamples);

	let predictedSample = 0; // 12-bit signed [-2048, 2047]
	let stepIndex = 0; // 0..48
	let sampleIdx = 0;

	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i] ?? 0;

		// High nibble first
		const nibble1 = (byte >> 4) & 0x0f;
		{
			const step = OKI_STEP_SIZE_TABLE[stepIndex] ?? 16;
			let diff = step >> 3;
			if (nibble1 & 1) diff += step >> 2;
			if (nibble1 & 2) diff += step >> 1;
			if (nibble1 & 4) diff += step;

			if (nibble1 & 8) {
				predictedSample -= diff;
			} else {
				predictedSample += diff;
			}

			if (predictedSample > 2047) predictedSample = 2047;
			else if (predictedSample < -2048) predictedSample = -2048;

			stepIndex += OKI_INDEX_TABLE[nibble1] ?? 0;
			if (stepIndex < 0) stepIndex = 0;
			else if (stepIndex > 48) stepIndex = 48;

			pcmSamples[sampleIdx++] = predictedSample << 4;
		}

		// Low nibble second
		const nibble2 = byte & 0x0f;
		{
			const step = OKI_STEP_SIZE_TABLE[stepIndex] ?? 16;
			let diff = step >> 3;
			if (nibble2 & 1) diff += step >> 2;
			if (nibble2 & 2) diff += step >> 1;
			if (nibble2 & 4) diff += step;

			if (nibble2 & 8) {
				predictedSample -= diff;
			} else {
				predictedSample += diff;
			}

			if (predictedSample > 2047) predictedSample = 2047;
			else if (predictedSample < -2048) predictedSample = -2048;

			stepIndex += OKI_INDEX_TABLE[nibble2] ?? 0;
			if (stepIndex < 0) stepIndex = 0;
			else if (stepIndex > 48) stepIndex = 48;

			pcmSamples[sampleIdx++] = predictedSample << 4;
		}

		if (i % 4096 === 0 && onProgress) {
			onProgress(0.15 + (i / bytes.length) * 0.7, "DECODING_SAMPLES");
		}
	}

	onProgress?.(0.9, "BUILD_WAV");

	// Build 44-byte standard RIFF WAV container
	const numChannels = 1;
	const bytesPerSample = 2; // 16-bit
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataBytesLen = sampleIdx * bytesPerSample;
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
	for (let i = 0; i < sampleIdx; i++) {
		wavView.setInt16(offset, pcmSamples[i] ?? 0, true);
		offset += 2;
	}

	const durationMs = Math.round((sampleIdx / sampleRate) * 1000);

	const metadata: VoxMetadata = {
		sampleRate,
		channels: numChannels,
		sampleCount: sampleIdx,
		durationMs,
		codec: "Dialogic OKI ADPCM (4-bit)",
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
