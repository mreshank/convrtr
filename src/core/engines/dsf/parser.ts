import type { DsfHeader } from "./types";

/**
 * Parses Sony DSF (DSD Stream File) header chunks ("DSD ", "fmt ", "data").
 */
export function parseDsfHeader(u8: Uint8Array): DsfHeader {
	if (u8.length < 92) {
		throw new Error(
			`Invalid DSF file: File too short (${u8.length} bytes, expected at least 92)`,
		);
	}

	const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

	// Check "DSD " magic (0x44, 0x53, 0x44, 0x20)
	if (u8[0] !== 0x44 || u8[1] !== 0x53 || u8[2] !== 0x44 || u8[3] !== 0x20) {
		throw new Error("Invalid DSF file: Missing 'DSD ' magic chunk identifier");
	}

	// 64-bit uint chunk size at offset 4 (little-endian, lower 32 bits)
	const dsdChunkSize = view.getUint32(4, true);
	if (dsdChunkSize < 28) {
		throw new Error(
			`Invalid DSF file: Unexpected 'DSD ' chunk size (${dsdChunkSize})`,
		);
	}

	const fileSize = view.getUint32(12, true);
	const metadataOffset = view.getUint32(20, true);

	// Check "fmt " chunk (0x66, 0x6d, 0x74, 0x20) at offset 28
	if (
		u8[28] !== 0x66 ||
		u8[29] !== 0x6d ||
		u8[30] !== 0x74 ||
		u8[31] !== 0x20
	) {
		throw new Error(
			"Invalid DSF file: Missing 'fmt ' chunk identifier at offset 28",
		);
	}

	const fmtChunkSize = view.getUint32(32, true);
	const formatVersion = view.getUint32(40, true);
	const formatId = view.getUint32(44, true);
	const channelType = view.getUint32(48, true);
	const channelCount = view.getUint32(52, true);
	const samplingFrequency = view.getUint32(56, true);
	const bitsPerSample = view.getUint32(60, true);
	const sampleCount = view.getUint32(64, true);
	const blockSizePerChannel = view.getUint32(72, true);

	if (channelCount === 0 || channelCount > 8) {
		throw new Error(
			`Invalid DSF file: Unsupported channel count (${channelCount})`,
		);
	}

	if (samplingFrequency === 0) {
		throw new Error(
			`Invalid DSF file: Invalid sampling frequency (${samplingFrequency})`,
		);
	}

	if (blockSizePerChannel === 0) {
		throw new Error(
			`Invalid DSF file: Invalid block size per channel (${blockSizePerChannel})`,
		);
	}

	// Check "data" chunk (0x64, 0x61, 0x74, 0x61) at offset 28 + fmtChunkSize
	const dataChunkHeaderOffset = 28 + fmtChunkSize;
	if (dataChunkHeaderOffset + 12 > u8.length) {
		throw new Error(
			"Invalid DSF file: Missing or truncated 'data' chunk header",
		);
	}

	if (
		u8[dataChunkHeaderOffset] !== 0x64 ||
		u8[dataChunkHeaderOffset + 1] !== 0x61 ||
		u8[dataChunkHeaderOffset + 2] !== 0x74 ||
		u8[dataChunkHeaderOffset + 3] !== 0x61
	) {
		throw new Error("Invalid DSF file: Missing 'data' chunk identifier");
	}

	const dataOffset = dataChunkHeaderOffset + 12;
	const dataLength = Math.max(0, u8.length - dataOffset);

	return {
		fileSize,
		metadataOffset,
		formatVersion,
		formatId,
		channelType,
		channelCount,
		samplingFrequency,
		bitsPerSample,
		sampleCount,
		blockSizePerChannel,
		dataOffset,
		dataLength,
	};
}

/**
 * Creates a standard 44-byte RIFF WAV buffer containing 16-bit linear PCM.
 */
function createWavBuffer(
	samples: Int16Array,
	sampleRate: number,
	channels: number,
): Uint8Array {
	const dataLength = samples.length * 2;
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
	view.setUint32(28, sampleRate * channels * 2, true); // Byte rate
	view.setUint16(32, channels * 2, true); // Block align
	view.setUint16(34, 16, true); // 16 bits per sample

	// "data"
	u8[36] = 0x64;
	u8[37] = 0x61;
	u8[38] = 0x74;
	u8[39] = 0x61;
	view.setUint32(40, dataLength, true);

	for (let i = 0; i < samples.length; i++) {
		view.setInt16(44 + i * 2, samples[i] ?? 0, true);
	}

	return u8;
}

/**
 * Converts Sony DSF 1-bit DSD audio into standard 16-bit linear PCM RIFF WAV.
 */
export async function convertDsfToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<Uint8Array> {
	onProgress?.(0.1, "Reading DSF header");
	const u8 = new Uint8Array(input);
	const header = parseDsfHeader(u8);
	const {
		channelCount,
		samplingFrequency,
		blockSizePerChannel,
		dataOffset,
		dataLength,
	} = header;

	if (dataLength <= 0) {
		throw new Error("Invalid DSF file: No audio data payload present");
	}

	// Decimation factor R: e.g. 2822400 / 44100 = 64
	const decimationFactor = Math.max(1, Math.round(samplingFrequency / 44100));
	const targetSampleRate = Math.round(samplingFrequency / decimationFactor);

	onProgress?.(
		0.25,
		`Decimating DSD (${samplingFrequency} Hz) to PCM (${targetSampleRate} Hz)`,
	);

	// Precalculate Hann filter weights
	const weights = new Float64Array(decimationFactor);
	let weightSum = 0;
	for (let k = 0; k < decimationFactor; k++) {
		const w =
			0.5 - 0.5 * Math.cos((2 * Math.PI * (k + 0.5)) / decimationFactor);
		weights[k] = w;
		weightSum += w;
	}
	if (weightSum === 0) weightSum = 1;

	// Demux audio channels from interleaved blocks
	const channelBytes: Uint8Array[] = Array.from(
		{ length: channelCount },
		() => new Uint8Array(Math.ceil(dataLength / channelCount)),
	);
	const channelWritePos = new Uint32Array(channelCount);

	const blockGroupSize = blockSizePerChannel * channelCount;
	const numFullGroups = Math.floor(dataLength / blockGroupSize);

	for (let g = 0; g < numFullGroups; g++) {
		const groupStart = dataOffset + g * blockGroupSize;
		for (let c = 0; c < channelCount; c++) {
			const blockStart = groupStart + c * blockSizePerChannel;
			const targetArray = channelBytes[c];
			const pos = channelWritePos[c] ?? 0;
			if (targetArray && pos + blockSizePerChannel <= targetArray.length) {
				targetArray.set(
					u8.subarray(blockStart, blockStart + blockSizePerChannel),
					pos,
				);
				channelWritePos[c] = pos + blockSizePerChannel;
			}
		}
	}

	// Handle trailing partial block group
	const remainder = dataLength % blockGroupSize;
	if (remainder > 0) {
		const groupStart = dataOffset + numFullGroups * blockGroupSize;
		let remainingBytes = remainder;
		for (let c = 0; c < channelCount && remainingBytes > 0; c++) {
			const take = Math.min(remainingBytes, blockSizePerChannel);
			const blockStart = groupStart + c * blockSizePerChannel;
			const targetArray = channelBytes[c];
			const pos = channelWritePos[c] ?? 0;
			if (targetArray && pos + take <= targetArray.length) {
				targetArray.set(u8.subarray(blockStart, blockStart + take), pos);
				channelWritePos[c] = pos + take;
			}
			remainingBytes -= take;
		}
	}

	onProgress?.(0.5, "Filtering and decimating 1-bit stream");

	// Determine number of output PCM samples per channel
	const minBytes = Math.min(...Array.from(channelWritePos));
	const total1BitSamples = minBytes * 8;
	const numPcmSamples = Math.floor(total1BitSamples / decimationFactor);

	const int16Interleaved = new Int16Array(numPcmSamples * channelCount);

	for (let c = 0; c < channelCount; c++) {
		const bytes = channelBytes[c];
		if (!bytes) continue;

		for (let s = 0; s < numPcmSamples; s++) {
			const startBit = s * decimationFactor;
			let acc = 0;

			for (let k = 0; k < decimationFactor; k++) {
				const bitIdx = startBit + k;
				const byteIdx = bitIdx >> 3;
				const bitInByte = bitIdx & 7; // LSB first in DSF!
				const b = bytes[byteIdx] ?? 0;
				const bitVal = (b >> bitInByte) & 1;
				const sampleVal = bitVal === 1 ? 1 : -1;
				acc += (weights[k] ?? 0) * sampleVal;
			}

			const normalized = acc / weightSum;
			const clamped = Math.max(-1.0, Math.min(1.0, normalized));
			const pcmVal =
				clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
			const sample16 = Math.max(-32768, Math.min(32767, pcmVal));

			int16Interleaved[s * channelCount + c] = sample16;
		}
	}

	onProgress?.(0.85, "Synthesizing RIFF WAV");
	const wav = createWavBuffer(int16Interleaved, targetSampleRate, channelCount);
	onProgress?.(1.0, "Complete");
	return wav;
}
