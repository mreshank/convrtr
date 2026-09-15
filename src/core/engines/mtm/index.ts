import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMtmToWav } from "./parser";
import type { MtmConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * MultiTracker Module (.mtm) audio tracker conversion engine.
 * Synthesizes 32-channel MS-DOS MultiTracker songs into 16-bit stereo WAV audio.
 */
export const mtmToWavEngine: Engine = {
	id: "extract:mtm-to-wav",

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
				: Number.parseInt(String(params.stereoSeparation ?? "70"), 10) || 70;

		const loopCount =
			typeof params.loopCount === "number"
				? params.loopCount
				: Number.parseInt(String(params.loopCount ?? "0"), 10) || 0;

		const options: MtmConversionOptions = {
			sampleRate,
			stereoSeparation,
			loopCount,
		};

		const result = convertMtmToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
