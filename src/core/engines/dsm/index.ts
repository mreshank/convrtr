import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDsmToWav } from "./parser";
import type { DsmToWavOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Dynamic Studio Module (.dsm) audio tracker conversion engine.
 * Synthesizes 16-channel RIFF DSMF tracker music with 8-bit PCM samples into 16-bit stereo WAV.
 */
export const dsmToWavEngine: Engine = {
	id: "extract:dsm-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const sampleRate =
			typeof params.sampleRate === "number"
				? params.sampleRate
				: Number.parseInt(String(params.sampleRate ?? "44100"), 10) || 44100;

		const stereoSeparation =
			typeof params.stereoSeparation === "number"
				? params.stereoSeparation
				: Number.parseInt(String(params.stereoSeparation ?? "75"), 10) || 75;

		const options: DsmToWavOptions = {
			sampleRate,
			stereoSeparation,
		};

		const result = convertDsmToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
