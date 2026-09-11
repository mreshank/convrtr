import type {
	AvrConversionResult,
	AvrMetadata,
	AvrToWavOptions,
} from "./types";

/**
 * Parses and decodes an Atari ST Audio Visual Research (.avr) digital audio file
 * into a universal 16-bit linear PCM RIFF WAV audio file.
 */
export function convertAvrToWav(
	input: Uint8Array | ArrayBuffer,
	options: AvrToWavOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): AvrConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 128) {
		throw new Error(
			`Invalid AVR file: File size (${bytes.length} bytes) is too small to contain a 128-byte AVR header.`,
		);
	}

	// Verify "2VRH" magic signature (0x32 0x56 0x52 0x48)
	if (
		bytes[0] !== 0x32 ||
		bytes[1] !== 0x56 ||
		bytes[2] !== 0x52 ||
		bytes[3] !== 0x48
	) {
		throw new Error("Invalid AVR file: Missing '2VRH' signature in header.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const decoder = new TextDecoder("ascii");

	// 4..11: 8-byte sample name
	const sampleName = decoder
		.decode(bytes.subarray(4, 12))
		.replace(/\0/g, "")
		.trim();

	// 12..13: 0 = mono, 0xFFFF = stereo
	const channelsRaw = view.getUint16(12, false);
	const channels = channelsRaw === 0xffff ? 2 : 1;

	// 14..15: 8 = 8-bit, 16 = 16-bit
	const bitsRaw = view.getUint16(14, false);
	const bitsPerSample = bitsRaw === 16 ? 16 : 8;

	// 16..17: 0 = unsigned, 0xFFFF = signed
	const signedRaw = view.getUint16(16, false);
	const isSigned = signedRaw === 0xffff;

	// 18..19: loop mode (0 = no loop, 0xFFFF = loop)
	const loopRaw = view.getUint16(18, false);
	const isLooping = loopRaw === 0xffff;

	// 22..25: sample rate in Hz (32-bit big-endian unsigned int)
	const rawSampleRate = view.getUint32(22, false);
	const sampleRate =
		rawSampleRate > 0 && rawSampleRate <= 192000 ? rawSampleRate : 22050;

	// 26..29: length in samples
	const numSamples = view.getUint32(26, false);

	// 40..127: user comment / description
	const userComment = decoder
		.decode(bytes.subarray(40, 128))
		.replace(/\0/g, "")
		.trim();

	onProgress?.(0.2, "DECODE_SAMPLES");

	const audioData = bytes.subarray(128);
	const bytesPerChannelSample = bitsPerSample === 16 ? 2 : 1;
	const frameBytes = channels * bytesPerChannelSample;

	// Calculate total sample frames available from file body
	const availableFrames = Math.floor(audioData.length / frameBytes);
	const totalFrames =
		numSamples > 0 && numSamples <= availableFrames
			? numSamples
			: availableFrames;

	const totalOutputPcmSamples = totalFrames * channels;
	const pcmSamples = new Int16Array(totalOutputPcmSamples);
	const dataView = new DataView(
		audioData.buffer,
		audioData.byteOffset,
		audioData.byteLength,
	);

	let outIndex = 0;
	let inOffset = 0;
	let maxPeak = 0;

	for (let i = 0; i < totalFrames; i++) {
		for (let ch = 0; ch < channels; ch++) {
			if (inOffset >= audioData.length) {
				pcmSamples[outIndex++] = 0;
				continue;
			}

			let sampleVal: number;
			if (bitsPerSample === 16) {
				if (isSigned) {
					sampleVal = dataView.getInt16(inOffset, false);
				} else {
					sampleVal = dataView.getUint16(inOffset, false) - 32768;
				}
				inOffset += 2;
			} else {
				// 8-bit sample
				const rawByte = audioData[inOffset++] ?? 0;
				if (isSigned) {
					// Signed 8-bit (-128..127) -> scale to 16-bit
					const s8 = rawByte > 127 ? rawByte - 256 : rawByte;
					sampleVal = s8 * 256;
				} else {
					// Unsigned 8-bit (0..255) -> center at 128, scale to 16-bit
					sampleVal = (rawByte - 128) * 256;
				}
			}

			sampleVal = Math.max(-32768, Math.min(32767, sampleVal));
			if (Math.abs(sampleVal) > maxPeak) {
				maxPeak = Math.abs(sampleVal);
			}
			pcmSamples[outIndex++] = sampleVal;
		}
	}

	// Optional audio peak normalization (-0.5 dBFS approx 30800)
	if (options.normalize && maxPeak > 0 && maxPeak < 30000) {
		const gain = 30800 / maxPeak;
		for (let i = 0; i < totalOutputPcmSamples; i++) {
			const s = Math.round((pcmSamples[i] ?? 0) * gain);
			pcmSamples[i] = Math.max(-32768, Math.min(32767, s));
		}
	}

	onProgress?.(0.85, "BUILD_WAV");

	// Synthesize standard 44-byte RIFF WAVE container
	const wavBitsPerSample = 16;
	const byteRate = sampleRate * channels * (wavBitsPerSample / 8);
	const blockAlign = channels * (wavBitsPerSample / 8);
	const dataBytesLen = totalOutputPcmSamples * 2;
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
	wavView.setUint16(34, wavBitsPerSample, true);

	// "data"
	wavBuffer[36] = 0x64;
	wavBuffer[37] = 0x61;
	wavBuffer[38] = 0x74;
	wavBuffer[39] = 0x61;
	wavView.setUint32(40, dataBytesLen, true);

	// Copy 16-bit PCM samples in little-endian format
	let wavOffset = 44;
	for (let i = 0; i < totalOutputPcmSamples; i++) {
		wavView.setInt16(wavOffset, pcmSamples[i] ?? 0, true);
		wavOffset += 2;
	}

	const durationSeconds = sampleRate > 0 ? totalFrames / sampleRate : 0;

	const metadata: AvrMetadata = {
		sampleName: sampleName || "Untitled Sample",
		channels,
		sampleRate,
		bitsPerSample,
		isSigned,
		isLooping,
		numSamples: totalFrames,
		durationSeconds,
		userComment,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
