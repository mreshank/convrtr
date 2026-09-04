import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { decodeFlac, encodeFlac } from "./flac";
import { parseWav, type WavAudio, writeWav } from "./wav";

/**
 * Cuts a section out of an audio file, sample-exactly.
 *
 * Worth contrasting with the video trim, which cannot do this. Video frames
 * depend on the frames before them, so a cut that copies data has to start at a
 * keyframe and the tool reports where it actually landed. Audio has no such
 * constraint: every sample stands alone, so the cut happens precisely where it
 * was asked for, to the sample.
 *
 * For WAV that means slicing the arrays. For FLAC it means decode, slice,
 * re-encode — which sounds lossy and is not: FLAC reproduces its input exactly,
 * so re-encoding the cut region yields the same samples that were in the
 * original. The only cost is time.
 */

function sliceAudio(
	audio: WavAudio,
	startSeconds: number,
	endSeconds: number,
): WavAudio {
	const total = audio.samples[0]?.length ?? 0;
	const duration = total / audio.sampleRate;

	const from = Math.max(0, Math.round(startSeconds * audio.sampleRate));
	const requestedEnd = endSeconds > 0 ? endSeconds : Number.POSITIVE_INFINITY;
	const to = Math.min(total, Math.round(requestedEnd * audio.sampleRate));

	if (to <= from) {
		throw new Error(
			`The clip must end after it starts. This file is ${duration.toFixed(2)} seconds long — move the handles so the selection covers some audio.`,
		);
	}

	return {
		sampleRate: audio.sampleRate,
		channels: audio.channels,
		bitsPerSample: audio.bitsPerSample,
		samples: audio.samples.map((channel) => channel.slice(from, to)),
	};
}

function readRange(params: Record<string, ParamValue>): [number, number] {
	const start = typeof params.start === "number" ? params.start : 0;
	const end = typeof params.end === "number" ? params.end : 0;
	return [start, end];
}

/** WAV in, WAV out. A pure array slice: nothing is decoded or re-encoded. */
export function createWavTrimEngine(): Engine {
	return {
		id: "trim:wav",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.2, "READ");
			const [start, end] = readRange(params);
			const audio = sliceAudio(parseWav(input), start, end);
			onProgress(0.7, "WRITE");

			const seconds = (audio.samples[0]?.length ?? 0) / audio.sampleRate;
			onNotice?.(
				`Cut ${seconds.toFixed(2)} seconds, exactly where you asked — audio has no keyframes, so the cut lands on the sample rather than near it. The samples kept are untouched.`,
			);

			const output = writeWav(audio);
			onProgress(1, "WRITE");
			return output;
		},
	};
}

/** FLAC in, FLAC out. Decoded, sliced and re-encoded — still bit-exact. */
export function createFlacTrimEngine(): Engine {
	return {
		id: "trim:flac",

		async probe() {
			return true;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			onProgress(0.15, "DECODE");
			const [start, end] = readRange(params);
			const audio = sliceAudio(await decodeFlac(input), start, end);

			onProgress(0.6, "ENCODE");
			const output = await encodeFlac(audio, {
				compression:
					typeof params.compression === "number"
						? params.compression
						: undefined,
				verify: true,
			});

			const seconds = (audio.samples[0]?.length ?? 0) / audio.sampleRate;
			onNotice?.(
				`Cut ${seconds.toFixed(2)} seconds, exactly where you asked. The file was decoded and re-encoded to make the cut, which costs nothing: FLAC reproduces its input exactly, so these are the same samples that were in the original.`,
			);

			onProgress(1, "ENCODE");
			return output.buffer as ArrayBuffer;
		},
	};
}
