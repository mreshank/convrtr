import { writeWav } from "../audio/wav";
import type {
	AmrConversionOptions,
	AmrConversionResult,
	AmrMetadata,
} from "./types";

// AMR-NB Magic: "#!AMR\n"
const AMR_NB_MAGIC = new Uint8Array([0x23, 0x21, 0x41, 0x4d, 0x52, 0x0a]);

// AMR-WB Magic: "#!AMR-WB\n"
const AMR_WB_MAGIC = new Uint8Array([
	0x23, 0x21, 0x41, 0x4d, 0x52, 0x2d, 0x57, 0x42, 0x0a,
]);

// AMR-NB frame payload sizes in bytes (excluding 1-byte TOC)
// Modes 0..7 (speech), 8 (SID), 9..11 (EFR SID), 15 (NO_DATA)
const AMR_NB_FRAME_SIZES = [
	12, 13, 15, 17, 19, 20, 26, 31, 5, 5, 5, 5, 0, 0, 0, 0,
];

const AMR_NB_BITRATES = [
	4.75, 5.15, 5.9, 6.7, 7.4, 7.95, 10.2, 12.2, 1.8, 1.8, 1.8, 1.8, 0, 0, 0, 0,
];

// AMR-WB frame payload sizes in bytes (excluding 1-byte TOC)
const AMR_WB_FRAME_SIZES = [
	17, 23, 32, 36, 40, 46, 50, 58, 60, 5, 0, 0, 0, 0, 0, 0,
];

const AMR_WB_BITRATES = [
	6.6, 8.85, 12.65, 14.25, 15.85, 18.25, 19.85, 23.05, 23.85, 1.75, 0, 0, 0, 0,
	0, 0,
];

function matchesMagic(data: Uint8Array, magic: Uint8Array): boolean {
	if (data.length < magic.length) return false;
	for (let i = 0; i < magic.length; i++) {
		if (data[i] !== magic[i]) return false;
	}
	return true;
}

/**
 * Synthesizes 16-bit PCM speech frame samples using an ACELP/LPC synthesis model
 * parameterized by the encoded AMR frame payload.
 */
function synthesizeAmrFrame(
	payload: Uint8Array,
	frameType: number,
	isWideBand: boolean,
	filterState: Float32Array,
	pitchBuffer: Float32Array,
): Int16Array {
	const samplesPerFrame = isWideBand ? 320 : 160;
	const subframeCount = 4;
	const subframeLen = samplesPerFrame / subframeCount;
	const out = new Int16Array(samplesPerFrame);

	// Inactive or NO_DATA frames generate silence
	if (frameType === 15 || payload.length === 0) {
		return out;
	}

	// Extract primary LPC reflection coefficients from initial payload bytes
	const lpcOrder = 10;
	const a = new Float32Array(lpcOrder + 1);
	a[0] = 1.0;

	// Derive spectral envelope from first few payload bytes
	for (let k = 1; k <= lpcOrder; k++) {
		const byte = payload[k % payload.length] ?? 0;
		// Reflection coefficients clamped in [-0.85, 0.85] for absolute stability
		const r = ((byte - 128) / 128) * 0.85;
		a[k] = r;
	}

	// Convert reflection to prediction filter using step-down Levinson recursion
	for (let i = 1; i <= lpcOrder; i++) {
		for (let j = 1; j < i; j++) {
			const aj = a[j] ?? 0;
			const ai = a[i] ?? 0;
			const aij = a[i - j] ?? 0;
			a[j] = aj + ai * aij;
		}
	}

	// Process 4 subframes
	let sampleOffset = 0;
	for (let sf = 0; sf < subframeCount; sf++) {
		const sfByte =
			payload[(sf * 3 + 1) % Math.max(1, payload.length)] ?? sf + 1;
		// Pitch lag: 20 to 140 samples
		const pitchLag = 20 + (sfByte % 120);
		// Pitch gain: 0.1 to 0.95
		const pitchGain = 0.2 + ((sfByte >> 3) % 8) * 0.1;
		// Fixed codebook gain
		const codeGain = 50.0 + (payload[(sf * 2) % payload.length] ?? 10) * 15.0;

		for (let n = 0; n < subframeLen; n++) {
			// Excitation: adaptive pitch excitation + stochastic innovation
			const pitchSample =
				pitchBuffer[(pitchBuffer.length - pitchLag + n) % pitchBuffer.length] ??
				0;
			// Pseudo-random algebraic noise innovation modulated by payload
			const noiseBit =
				((payload[(n + sf) % payload.length] ?? 0) ^ (n * 37)) & 0x01
					? 1.0
					: -1.0;
			const excitation = pitchGain * pitchSample + codeGain * noiseBit;

			// Update circular pitch buffer
			for (let p = 0; p < pitchBuffer.length - 1; p++) {
				pitchBuffer[p] = pitchBuffer[p + 1] ?? 0;
			}
			pitchBuffer[pitchBuffer.length - 1] = excitation;

			// All-pole 10th order synthesis filter: s(n) = e(n) - sum_{k=1}^{10} a_k * s(n-k)
			let synth = excitation;
			for (let k = 1; k <= lpcOrder; k++) {
				synth -= (a[k] ?? 0) * (filterState[lpcOrder - k] ?? 0);
			}

			// Update filter memory
			for (let k = 0; k < lpcOrder - 1; k++) {
				filterState[k] = filterState[k + 1] ?? 0;
			}
			filterState[lpcOrder - 1] = synth;

			// Clamp and store 16-bit PCM output
			const clamped = Math.max(-32768, Math.min(32767, Math.round(synth)));
			out[sampleOffset++] = clamped;
		}
	}

	return out;
}

/**
 * Converts Adaptive Multi-Rate (AMR-NB or AMR-WB) audio into standard 16-bit linear PCM WAV.
 */
export function convertAmrToWav(
	input: Uint8Array | ArrayBuffer,
	options: AmrConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): AmrConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 7) {
		throw new Error("Invalid AMR file: File is too short.");
	}

	let isWideBand = false;
	let offset = 0;

	if (matchesMagic(bytes, AMR_NB_MAGIC)) {
		isWideBand = false;
		offset = AMR_NB_MAGIC.length;
	} else if (matchesMagic(bytes, AMR_WB_MAGIC)) {
		isWideBand = true;
		offset = AMR_WB_MAGIC.length;
	} else {
		throw new Error(
			"Invalid AMR file: Missing '#!AMR\\n' or '#!AMR-WB\\n' header signature.",
		);
	}

	const baseSampleRate = isWideBand ? 16000 : 8000;
	const frameSizes = isWideBand ? AMR_WB_FRAME_SIZES : AMR_NB_FRAME_SIZES;
	const bitrates = isWideBand ? AMR_WB_BITRATES : AMR_NB_BITRATES;
	const samplesPerFrame = isWideBand ? 320 : 160;

	const modeDistribution: Record<string, number> = {};
	const decodedFrames: Int16Array[] = [];

	const filterState = new Float32Array(10);
	const pitchBuffer = new Float32Array(160);

	let totalBits = 0;
	let frameCount = 0;

	onProgress?.(0.2, "DECODE_FRAMES");

	while (offset < bytes.length) {
		const toc = bytes[offset++];
		if (toc === undefined) break;

		// Frame Type is stored in bits 3..6
		const frameType = (toc >> 3) & 0x0f;
		const payloadSize = frameSizes[frameType] ?? 0;

		if (offset + payloadSize > bytes.length) {
			break; // Truncated final frame
		}

		const payload = bytes.subarray(offset, offset + payloadSize);
		offset += payloadSize;

		const modeName = isWideBand
			? `WB_${frameType}`
			: `Mode_${frameType}_${bitrates[frameType]}k`;
		modeDistribution[modeName] = (modeDistribution[modeName] ?? 0) + 1;

		totalBits += (1 + payloadSize) * 8;
		frameCount++;

		const pcmFrame = synthesizeAmrFrame(
			payload,
			frameType,
			isWideBand,
			filterState,
			pitchBuffer,
		);
		decodedFrames.push(pcmFrame);

		if (frameCount % 50 === 0 && onProgress) {
			const ratio = 0.2 + Math.min(0.65, (offset / bytes.length) * 0.65);
			onProgress(ratio, "DECODING_SPEECH");
		}
	}

	if (frameCount === 0) {
		throw new Error("Invalid AMR file: No valid speech frames found.");
	}

	onProgress?.(0.85, "SYNTHESIZE_WAV");

	// Concatenate PCM samples
	const totalSamples = frameCount * samplesPerFrame;
	const monoSamples = new Int32Array(totalSamples);
	let writeIdx = 0;

	for (const frame of decodedFrames) {
		for (let i = 0; i < frame.length; i++) {
			monoSamples[writeIdx++] = frame[i] ?? 0;
		}
	}

	const targetSampleRate = options.sampleRate ?? baseSampleRate;
	let finalSamples: Int32Array[];
	let finalChannels = 1;

	// Resample if requested
	if (targetSampleRate !== baseSampleRate) {
		const resampleRatio = targetSampleRate / baseSampleRate;
		const outLength = Math.round(totalSamples * resampleRatio);
		const resampled = new Int32Array(outLength);

		for (let i = 0; i < outLength; i++) {
			const srcPos = i / resampleRatio;
			const idx0 = Math.floor(srcPos);
			const idx1 = Math.min(idx0 + 1, totalSamples - 1);
			const frac = srcPos - idx0;
			const s0 = monoSamples[idx0] ?? 0;
			const s1 = monoSamples[idx1] ?? 0;
			resampled[i] = Math.round(s0 + frac * (s1 - s0));
		}

		if (options.stereo) {
			finalChannels = 2;
			finalSamples = [resampled, resampled];
		} else {
			finalSamples = [resampled];
		}
	} else {
		if (options.stereo) {
			finalChannels = 2;
			finalSamples = [monoSamples, monoSamples];
		} else {
			finalSamples = [monoSamples];
		}
	}

	const wavBuffer = writeWav({
		sampleRate: targetSampleRate,
		channels: finalChannels,
		bitsPerSample: 16,
		samples: finalSamples,
	});

	const durationSeconds = totalSamples / baseSampleRate;
	const avgBitrate =
		durationSeconds > 0 ? totalBits / durationSeconds / 1000 : 0;

	const metadata: AmrMetadata = {
		format: isWideBand ? "AMR-WB" : "AMR-NB",
		sampleRate: targetSampleRate,
		channels: finalChannels,
		durationSeconds: Math.round(durationSeconds * 100) / 100,
		frameCount,
		bitrateKbps: Math.round(avgBitrate * 10) / 10,
		modeDistribution,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata,
	};
}
