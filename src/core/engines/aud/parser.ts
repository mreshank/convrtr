import type {
	AudConversionResult,
	AudMetadata,
	AudToWavOptions,
} from "./types";

export const IMA_STEP_TABLE = [
	7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
	50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
	253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
	1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
	3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
	11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
	32767,
];

export const IMA_INDEX_TABLE = [
	-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8,
];

export const WS_ADPCM_8BIT_TABLE = [
	-134, -84, -49, -23, -9, -2, 0, 1, 2, 9, 23, 49, 84, 134, 0, 0,
];

function decodeImaNibble(
	nibble: number,
	state: { sample: number; stepIndex: number },
): number {
	const step = IMA_STEP_TABLE[state.stepIndex] ?? 7;
	let diff = step >> 3;
	if (nibble & 1) diff += step >> 2;
	if (nibble & 2) diff += step >> 1;
	if (nibble & 4) diff += step;

	if (nibble & 8) {
		state.sample -= diff;
	} else {
		state.sample += diff;
	}

	state.sample = Math.max(-32768, Math.min(32767, state.sample));
	state.stepIndex = Math.max(
		0,
		Math.min(88, state.stepIndex + (IMA_INDEX_TABLE[nibble] ?? 0)),
	);

	return state.sample;
}

/**
 * Parses and decodes a Westwood Studios (.aud) audio file (Command & Conquer, Red Alert, Dune 2000)
 * into a universal 16-bit linear PCM RIFF WAV audio file.
 */
export function convertAudToWav(
	input: Uint8Array | ArrayBuffer,
	options: AudToWavOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): AudConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 12) {
		throw new Error(
			`Invalid AUD file: File size (${bytes.length} bytes) is too small to contain a 12-byte Westwood AUD header.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const rawSampleRate = view.getUint16(0, true);
	const _compressedSize = view.getUint32(2, true);
	const _decompressedSize = view.getUint32(6, true);
	const flags = view.getUint8(10);
	const compressionType = view.getUint8(11);

	const isStereo = (flags & 0x01) !== 0;
	const is16Bit = (flags & 0x02) !== 0;
	const channels = isStereo ? 2 : 1;

	const overrideRate = options.sampleRateOverride
		? Number(options.sampleRateOverride)
		: 0;
	const sampleRate =
		overrideRate > 0
			? overrideRate
			: rawSampleRate > 0 && rawSampleRate <= 192000
				? rawSampleRate
				: 22050;

	let compressionName = "Uncompressed PCM";
	if (compressionType === 1) {
		compressionName = "Westwood WS-ADPCM";
	} else if (compressionType === 2) {
		compressionName = "IMA-ADPCM";
	} else if (compressionType !== 0) {
		compressionName = `Westwood Type ${compressionType}`;
	}

	onProgress?.(0.15, "DECODE_BLOCKS");

	const decodedSamples: number[] = [];

	// Chunk-based iteration or flat stream
	let offset = 12;
	let hasChunks = false;

	if (offset + 4 <= bytes.length) {
		const firstChunkComp = view.getUint16(offset, true);
		if (
			firstChunkComp > 0 &&
			firstChunkComp <= bytes.length - 12 &&
			firstChunkComp < 65535
		) {
			hasChunks = true;
		}
	}

	const state = { sample: 0, stepIndex: 0 };
	let sample8Accum = 128;

	if (hasChunks) {
		while (offset + 4 <= bytes.length) {
			const chunkComp = view.getUint16(offset, true);
			const _chunkDecomp = view.getUint16(offset + 2, true);
			offset += 4;

			if (chunkComp === 0 || offset + chunkComp > bytes.length) {
				break;
			}

			const chunkData = bytes.subarray(offset, offset + chunkComp);
			offset += chunkComp;

			decodeChunkData(chunkData);
		}
	} else {
		// Flat audio stream
		const payload = bytes.subarray(12);
		decodeChunkData(payload);
	}

	function decodeChunkData(chunk: Uint8Array) {
		if (compressionType === 0) {
			// Uncompressed PCM
			if (is16Bit) {
				const chunkView = new DataView(
					chunk.buffer,
					chunk.byteOffset,
					chunk.byteLength,
				);
				const count = Math.floor(chunk.byteLength / 2);
				for (let i = 0; i < count; i++) {
					decodedSamples.push(chunkView.getInt16(i * 2, true));
				}
			} else {
				for (let i = 0; i < chunk.byteLength; i++) {
					const u8 = chunk[i] ?? 128;
					decodedSamples.push((u8 - 128) * 256);
				}
			}
		} else if (compressionType === 1 && !is16Bit) {
			// 8-bit WS-ADPCM
			for (let i = 0; i < chunk.byteLength; i++) {
				const b = chunk[i] ?? 0;
				const nibble0 = b & 0x0f;
				const nibble1 = (b >> 4) & 0x0f;

				sample8Accum = Math.max(
					0,
					Math.min(255, sample8Accum + (WS_ADPCM_8BIT_TABLE[nibble0] ?? 0)),
				);
				decodedSamples.push((sample8Accum - 128) * 256);

				sample8Accum = Math.max(
					0,
					Math.min(255, sample8Accum + (WS_ADPCM_8BIT_TABLE[nibble1] ?? 0)),
				);
				decodedSamples.push((sample8Accum - 128) * 256);
			}
		} else {
			// 16-bit IMA-ADPCM or 16-bit WS-ADPCM
			for (let i = 0; i < chunk.byteLength; i++) {
				const b = chunk[i] ?? 0;
				const nibble0 = b & 0x0f;
				const nibble1 = (b >> 4) & 0x0f;

				decodedSamples.push(decodeImaNibble(nibble0, state));
				decodedSamples.push(decodeImaNibble(nibble1, state));
			}
		}
	}

	onProgress?.(0.7, "BUILD_WAV");

	const sampleCount = decodedSamples.length;
	const bitsPerSample = 16;
	const blockAlign = channels * (bitsPerSample / 8);
	const byteRate = sampleRate * blockAlign;
	const dataBytesLen = sampleCount * 2;
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
	wavView.setUint32(16, 16, true);
	wavView.setUint16(20, 1, true); // Linear PCM
	wavView.setUint16(22, channels, true);
	wavView.setUint32(24, sampleRate, true);
	wavView.setUint32(28, byteRate, true);
	wavView.setUint16(32, blockAlign, true);
	wavView.setUint16(34, bitsPerSample, true);

	// "data"
	wavBuffer[36] = 0x64;
	wavBuffer[37] = 0x61;
	wavBuffer[38] = 0x74;
	wavBuffer[39] = 0x61;
	wavView.setUint32(40, dataBytesLen, true);

	let outPos = 44;
	for (let i = 0; i < sampleCount; i++) {
		wavView.setInt16(outPos, decodedSamples[i] ?? 0, true);
		outPos += 2;
	}

	const durationMs =
		channels > 0 && sampleRate > 0
			? Math.round((sampleCount / channels / sampleRate) * 1000)
			: 0;

	const metadata: AudMetadata = {
		sampleRate,
		channels,
		compressionType,
		compressionName,
		bitsPerSample: is16Bit ? 16 : 8,
		sampleCount,
		durationMs,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
