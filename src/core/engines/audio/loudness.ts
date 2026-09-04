import type { WavAudio } from "./wav";

/**
 * Loudness measurement to ITU-R BS.1770 / EBU R128.
 *
 * "Normalise this to -14 LUFS" is the request behind almost every audio
 * levelling tool, because that is the figure the streaming services target.
 * Answering it means measuring loudness the way the standard defines it, which
 * is not the same as peak level and not the same as RMS:
 *
 *   1. Filter each channel with the K-weighting curve — a high shelf plus a
 *      high-pass — which approximates how much the ear cares about each part
 *      of the spectrum. Bass contributes far less to perceived loudness than
 *      its energy suggests, and unweighted RMS gets that badly wrong.
 *   2. Take mean square power over 400ms blocks overlapping by 75%.
 *   3. Discard blocks below an absolute gate of -70 LUFS, then discard blocks
 *      more than 10 LU below the mean of what remains.
 *
 * That second gate is the part naive implementations skip, and it matters: it
 * is what stops silence and quiet passages dragging the measurement down, so a
 * sparse track and a dense one that sound equally loud measure equally loud.
 *
 * The filter coefficients are derived for the file's own sample rate rather
 * than taken from the 48kHz table in the specification. A 44.1kHz file run
 * through 48kHz coefficients measures wrong by a few tenths of a decibel —
 * small enough to look plausible and to go unnoticed.
 */

/** A cascade of two biquads, applied per channel. */
type Biquad = {
	b0: number;
	b1: number;
	b2: number;
	a1: number;
	a2: number;
};

/**
 * Stage 1: a high shelf approximating the acoustic effect of the head.
 *
 * Constants are from the specification's analog prototype; deriving `K` from
 * the actual sample rate is what makes the response correct at rates other
 * than 48kHz.
 */
function highShelf(sampleRate: number): Biquad {
	const f0 = 1681.974450955533;
	const G = 3.999843853973347;
	const Q = 0.7071752369554196;

	const K = Math.tan((Math.PI * f0) / sampleRate);
	const Vh = 10 ** (G / 20);
	const Vb = Vh ** 0.4996667741545416;
	const a0 = 1 + K / Q + K * K;

	return {
		b0: (Vh + (Vb * K) / Q + K * K) / a0,
		b1: (2 * (K * K - Vh)) / a0,
		b2: (Vh - (Vb * K) / Q + K * K) / a0,
		a1: (2 * (K * K - 1)) / a0,
		a2: (1 - K / Q + K * K) / a0,
	};
}

/** Stage 2: a high-pass that removes rumble the ear barely registers. */
function highPass(sampleRate: number): Biquad {
	const f0 = 38.13547087602444;
	const Q = 0.5003270373238773;

	const K = Math.tan((Math.PI * f0) / sampleRate);
	const denominator = 1 + K / Q + K * K;

	return {
		b0: 1,
		b1: -2,
		b2: 1,
		a1: (2 * (K * K - 1)) / denominator,
		a2: (1 - K / Q + K * K) / denominator,
	};
}

/** Direct form I, which keeps the arithmetic obvious at this scale. */
function applyBiquad(samples: Float64Array, filter: Biquad): void {
	let x1 = 0;
	let x2 = 0;
	let y1 = 0;
	let y2 = 0;

	for (let i = 0; i < samples.length; i++) {
		const x0 = samples[i] ?? 0;
		const y0 =
			filter.b0 * x0 +
			filter.b1 * x1 +
			filter.b2 * x2 -
			filter.a1 * y1 -
			filter.a2 * y2;
		samples[i] = y0;
		x2 = x1;
		x1 = x0;
		y2 = y1;
		y1 = y0;
	}
}

/** Normalises integer samples of any supported depth to -1..1. */
function toFloat(channel: Int32Array, bitsPerSample: number): Float64Array {
	const scale = 2 ** (bitsPerSample - 1);
	const out = new Float64Array(channel.length);
	for (let i = 0; i < channel.length; i++) {
		out[i] = (channel[i] ?? 0) / scale;
	}
	return out;
}

export type LoudnessResult = {
	/** Integrated loudness in LUFS, or null when the file is entirely silent. */
	integrated: number | null;
	/** Highest absolute sample value, 0..1 — sample peak, not true peak. */
	peak: number;
};

/**
 * Measures integrated loudness and sample peak.
 *
 * Peak is deliberately sample peak rather than true peak: true peak requires
 * oversampling to catch inter-sample overshoots, and reporting a sample peak
 * *as* a true peak would understate how close a file is to clipping. The
 * caller is told which one it has.
 */
export function measureLoudness(audio: WavAudio): LoudnessResult {
	const { sampleRate, bitsPerSample, samples } = audio;
	const channels = samples.length;
	if (channels === 0) return { integrated: null, peak: 0 };

	const frames = samples[0]?.length ?? 0;
	if (frames === 0) return { integrated: null, peak: 0 };

	const shelf = highShelf(sampleRate);
	const pass = highPass(sampleRate);

	let peak = 0;
	const weighted: Float64Array[] = [];
	for (const channel of samples) {
		const float = toFloat(channel, bitsPerSample);
		for (let i = 0; i < float.length; i++) {
			const magnitude = Math.abs(float[i] ?? 0);
			if (magnitude > peak) peak = magnitude;
		}
		// Filtering happens on a copy of the signal: the measurement must not
		// alter the audio it is measuring.
		const filtered = float.slice();
		applyBiquad(filtered, shelf);
		applyBiquad(filtered, pass);
		weighted.push(filtered);
	}

	// 400ms blocks, 75% overlap — so a new block starts every 100ms.
	const blockSize = Math.round(sampleRate * 0.4);
	const step = Math.round(sampleRate * 0.1);
	if (frames < blockSize) {
		// Shorter than one block: the standard's integrated measure is undefined
		// here, and inventing a number would be worse than declining to give one.
		return { integrated: null, peak };
	}

	// Mean square per block, summed across channels. Stereo channels both carry
	// a weight of 1.0; the surround weights in the standard do not apply.
	const blockPower: number[] = [];
	for (let start = 0; start + blockSize <= frames; start += step) {
		let sum = 0;
		for (const channel of weighted) {
			let channelSum = 0;
			for (let i = start; i < start + blockSize; i++) {
				const value = channel[i] ?? 0;
				channelSum += value * value;
			}
			sum += channelSum / blockSize;
		}
		blockPower.push(sum);
	}

	if (blockPower.length === 0) return { integrated: null, peak };

	const loudnessOf = (power: number) =>
		power > 0 ? -0.691 + 10 * Math.log10(power) : Number.NEGATIVE_INFINITY;

	// Absolute gate: blocks quieter than -70 LUFS are not part of the programme.
	const aboveAbsolute = blockPower.filter((power) => loudnessOf(power) > -70);
	if (aboveAbsolute.length === 0) return { integrated: null, peak };

	const meanOf = (values: number[]) =>
		values.reduce((sum, value) => sum + value, 0) / values.length;

	// Relative gate: 10 LU below the mean of what survived the absolute gate.
	// This is the step that keeps quiet passages from dragging the figure down.
	const relativeThreshold = loudnessOf(meanOf(aboveAbsolute)) - 10;
	const aboveRelative = aboveAbsolute.filter(
		(power) => loudnessOf(power) > relativeThreshold,
	);
	if (aboveRelative.length === 0) return { integrated: null, peak };

	return { integrated: loudnessOf(meanOf(aboveRelative)), peak };
}
