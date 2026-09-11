/**
 * CRIWARE ADX to 16-bit Linear PCM WAV Decoder.
 * Decodes game audio from Dreamcast, PS2, GameCube, Wii, and modern Japanese console titles.
 */

export type AdxInfo = {
	channels: number;
	sampleRate: number;
	totalSamples: number;
	highpassFreq: number;
	dataOffset: number;
	blockSize: number;
};

/**
 * Parses CRIWARE ADX header metadata.
 */
export function parseAdxHeader(bytes: Uint8Array): AdxInfo {
	if (bytes.length < 32) {
		throw new Error(
			"parseAdx: File is too small to be a valid CRIWARE .adx file",
		);
	}

	// Signature check: 0x80 0x00
	if (bytes[0] !== 0x80 || bytes[1] !== 0x00) {
		throw new Error("parseAdx: Invalid ADX header signature (expected 0x8000)");
	}

	const copyrightOffset = ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0);
	const dataOffset = copyrightOffset + 4;

	if (dataOffset >= bytes.length) {
		throw new Error(
			"parseAdx: Corrupted header (data offset exceeds file size)",
		);
	}

	const encodingType = bytes[4] ?? 0;
	if (encodingType !== 3 && encodingType !== 4) {
		throw new Error(
			`parseAdx: Unsupported ADX encoding type (${encodingType}). Only standard ADX ADPCM is supported.`,
		);
	}

	const blockSize = bytes[5] ?? 18;
	const bitDepth = bytes[6] ?? 4;
	if (blockSize !== 18 || bitDepth !== 4) {
		throw new Error(
			`parseAdx: Unsupported block size (${blockSize}) or bit depth (${bitDepth})`,
		);
	}

	const channels = bytes[7] ?? 0;
	if (channels < 1 || channels > 2) {
		throw new Error(
			`parseAdx: Unsupported channel count (${channels}). Must be 1 (mono) or 2 (stereo).`,
		);
	}

	const sampleRate =
		((bytes[8] ?? 0) << 24) |
		((bytes[9] ?? 0) << 16) |
		((bytes[10] ?? 0) << 8) |
		(bytes[11] ?? 0);

	const totalSamples =
		((bytes[12] ?? 0) << 24) |
		((bytes[13] ?? 0) << 16) |
		((bytes[14] ?? 0) << 8) |
		(bytes[15] ?? 0);

	const highpassFreq = ((bytes[16] ?? 0) << 8) | (bytes[17] ?? 0);

	if (sampleRate <= 0 || totalSamples <= 0) {
		throw new Error("parseAdx: Invalid sample rate or sample count in header");
	}

	return {
		channels,
		sampleRate,
		totalSamples,
		highpassFreq,
		dataOffset,
		blockSize,
	};
}

/**
 * Generates a standard 44-byte RIFF/WAVE header for 16-bit PCM audio.
 */
function createWavHeader(
	channels: number,
	sampleRate: number,
	totalSamples: number,
): Uint8Array {
	const blockAlign = channels * 2;
	const byteRate = sampleRate * blockAlign;
	const dataSize = totalSamples * blockAlign;
	const fileSize = 36 + dataSize;

	const buffer = new ArrayBuffer(44);
	const view = new DataView(buffer);

	// "RIFF"
	view.setUint32(0, 0x52494646, false);
	view.setUint32(4, fileSize, true);
	// "WAVE"
	view.setUint32(8, 0x57415645, false);
	// "fmt "
	view.setUint32(12, 0x666d7420, false);
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true); // BitsPerSample (16)
	// "data"
	view.setUint32(36, 0x64617461, false);
	view.setUint32(40, dataSize, true);

	return new Uint8Array(buffer);
}

/**
 * Decodes CRIWARE ADX audio stream into a 16-bit PCM WAV ArrayBuffer.
 */
export function decodeAdxToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	const info = parseAdxHeader(bytes);

	onProgress?.(0.1, "HEADER");

	// Compute predictor coefficients from cutoff frequency
	const cutoff = info.highpassFreq > 0 ? info.highpassFreq : 500;
	const x = (2 * Math.PI * cutoff) / info.sampleRate;
	const y = Math.cos(x);
	const z = Math.SQRT2 - y;
	const c = (Math.SQRT2 - 1.0) / z;
	const coef1 = Math.SQRT2 - c;
	const coef2 = c * Math.SQRT2 - 1.0;

	const channels = info.channels;
	const totalSamples = info.totalSamples;
	const blockSize = info.blockSize; // 18 bytes
	const frameSize = blockSize * channels;

	// Output buffer: 2 bytes per sample per channel
	const pcmData = new Int16Array(totalSamples * channels);

	// Predictor states per channel: [s1, s2]
	const s1 = new Float64Array(channels);
	const s2 = new Float64Array(channels);

	let srcCursor = info.dataOffset;
	let sampleIndex = 0;

	onProgress?.(0.2, "DECODE");

	while (srcCursor + frameSize <= bytes.length && sampleIndex < totalSamples) {
		const samplesThisBlock = Math.min(32, totalSamples - sampleIndex);

		// Temporary buffer for current 32 samples per channel
		const channelSamples: Int16Array[] = [];

		for (let ch = 0; ch < channels; ch++) {
			const blockOffset = srcCursor + ch * blockSize;
			const scale =
				((bytes[blockOffset] ?? 0) << 8) | (bytes[blockOffset + 1] ?? 0);

			let prev1 = s1[ch] ?? 0;
			let prev2 = s2[ch] ?? 0;

			const chDecoded = new Int16Array(32);

			let nibbleIdx = 0;
			for (let i = 0; i < 16; i++) {
				const byteVal = bytes[blockOffset + 2 + i] ?? 0;
				// Upper nibble
				let n1 = (byteVal >> 4) & 0x0f;
				if (n1 >= 8) n1 -= 16; // 4-bit signed conversion (-8 to 7)

				// 2-pole linear prediction
				const pred1 = coef1 * prev1 + coef2 * prev2;
				let sample1 = pred1 + n1 * scale;
				if (sample1 > 32767) sample1 = 32767;
				else if (sample1 < -32768) sample1 = -32768;

				prev2 = prev1;
				prev1 = sample1;
				chDecoded[nibbleIdx++] = Math.round(sample1);

				// Lower nibble
				let n2 = byteVal & 0x0f;
				if (n2 >= 8) n2 -= 16;

				const pred2 = coef1 * prev1 + coef2 * prev2;
				let sample2 = pred2 + n2 * scale;
				if (sample2 > 32767) sample2 = 32767;
				else if (sample2 < -32768) sample2 = -32768;

				prev2 = prev1;
				prev1 = sample2;
				chDecoded[nibbleIdx++] = Math.round(sample2);
			}

			s1[ch] = prev1;
			s2[ch] = prev2;
			channelSamples.push(chDecoded);
		}

		// Interleave samples into output PCM buffer
		if (channels === 1) {
			const mono = channelSamples[0];
			if (mono) {
				for (let s = 0; s < samplesThisBlock; s++) {
					pcmData[sampleIndex + s] = mono[s] ?? 0;
				}
			}
		} else {
			const left = channelSamples[0];
			const right = channelSamples[1];
			if (left && right) {
				for (let s = 0; s < samplesThisBlock; s++) {
					const outOffset = (sampleIndex + s) * 2;
					pcmData[outOffset] = left[s] ?? 0;
					pcmData[outOffset + 1] = right[s] ?? 0;
				}
			}
		}

		sampleIndex += samplesThisBlock;
		srcCursor += frameSize;
	}

	onProgress?.(0.9, "MUX");

	const wavHeader = createWavHeader(channels, info.sampleRate, totalSamples);
	const wavBytes = new Uint8Array(wavHeader.length + pcmData.byteLength);
	wavBytes.set(wavHeader, 0);
	wavBytes.set(new Uint8Array(pcmData.buffer), wavHeader.length);

	onProgress?.(1.0, "DONE");

	return wavBytes.buffer as ArrayBuffer;
}
