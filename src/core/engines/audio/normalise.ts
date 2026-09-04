import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { decodeFlac, encodeFlac } from "./flac";
import { measureLoudness } from "./loudness";
import { parseWav, type WavAudio, writeWav } from "./wav";

/**
 * Adjusts a file's loudness to a target, measured to EBU R128.
 *
 * This is the one audio tool here that changes every sample on purpose, and it
 * is worth being exact about what that costs. Applying gain to integer samples
 * means multiplying and rounding, so the result is not the original scaled
 * exactly — it is the original scaled and requantised. The error is around
 * -96dB at 16-bit, far below anything audible, but "inaudible" is not
 * "identical" and this catalogue draws that line carefully everywhere else.
 *
 * ## Clipping is refused, not applied
 *
 * Reaching a loud target often needs more gain than the peaks allow. The usual
 * response is to apply it anyway and let the peaks clip, which sounds like
 * distortion on transients and cannot be undone. Instead the gain is capped so
 * the loudest sample lands at full scale, and the tool says plainly that the
 * target was not reached and by how much. A quieter file that is intact beats
 * a target hit with clipped peaks.
 */

/** Targets that correspond to real platform requirements. */
const MIN_TARGET = -36;
const MAX_TARGET = -5;

function clampTarget(value: ParamValue | undefined): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return -14;
	return Math.min(MAX_TARGET, Math.max(MIN_TARGET, value));
}

function applyGain(audio: WavAudio, gainDb: number): WavAudio {
	const factor = 10 ** (gainDb / 20);
	const limit = 2 ** (audio.bitsPerSample - 1);
	const max = limit - 1;
	const min = -limit;

	return {
		...audio,
		samples: audio.samples.map((channel) => {
			const out = new Int32Array(channel.length);
			for (let i = 0; i < channel.length; i++) {
				// Rounded, then clamped. The clamp should never engage given the
				// gain cap below, but a rounding step at exactly full scale can
				// land one past the representable maximum.
				const scaled = Math.round((channel[i] ?? 0) * factor);
				out[i] = scaled > max ? max : scaled < min ? min : scaled;
			}
			return out;
		}),
	};
}

type Normalised = {
	audio: WavAudio;
	notices: string[];
};

function normaliseAudio(audio: WavAudio, target: number): Normalised {
	const { integrated, peak } = measureLoudness(audio);
	const notices: string[] = [];

	if (integrated === null) {
		throw new Error(
			"This file is silent, or shorter than the 400ms that EBU R128 needs to measure loudness, so there is nothing to normalise against.",
		);
	}

	const wanted = target - integrated;

	// The gain that would put the loudest sample exactly at full scale.
	const headroom = peak > 0 ? -20 * Math.log10(peak) : Number.POSITIVE_INFINITY;
	const applied = Math.min(wanted, headroom);

	if (applied < wanted - 0.05) {
		notices.push(
			`Measured ${integrated.toFixed(1)} LUFS. Reaching ${target} LUFS would need ${wanted.toFixed(1)}dB of gain, which would clip the peaks, so ${applied.toFixed(1)}dB was applied instead — the result is ${(target - (integrated + applied)).toFixed(1)}dB quieter than asked for, and undistorted. Clipping cannot be undone; loudness can.`,
		);
	} else {
		notices.push(
			`Measured ${integrated.toFixed(1)} LUFS, applied ${applied >= 0 ? "+" : ""}${applied.toFixed(1)}dB to reach ${target} LUFS.`,
		);
	}

	notices.push(
		"Normalising multiplies every sample and rounds the result, so this file is not bit-identical to the original — that is inherent to changing loudness, not a shortcut. Keep the original if you may need it.",
	);

	return { audio: applyGain(audio, applied), notices };
}

/** WAV in, WAV out. */
export function createWavNormaliseEngine(): Engine {
	return {
		id: "normalise:wav",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.15, "MEASURE");
			const { audio, notices } = normaliseAudio(
				parseWav(input),
				clampTarget(params.target),
			);
			onProgress(0.8, "WRITE");
			for (const notice of notices) onNotice?.(notice);
			const output = writeWav(audio);
			onProgress(1, "WRITE");
			return output;
		},
	};
}

/** FLAC in, FLAC out. The gain is applied to samples, then re-encoded. */
export function createFlacNormaliseEngine(): Engine {
	return {
		id: "normalise:flac",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.1, "DECODE");
			const decoded = await decodeFlac(input);

			onProgress(0.4, "MEASURE");
			const { audio, notices } = normaliseAudio(
				decoded,
				clampTarget(params.target),
			);

			onProgress(0.7, "ENCODE");
			const output = await encodeFlac(audio, { verify: true });
			for (const notice of notices) onNotice?.(notice);
			onProgress(1, "ENCODE");
			return output.buffer as ArrayBuffer;
		},
	};
}
