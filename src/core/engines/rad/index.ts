import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRadToWav } from "./parser";
import type { RadConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Reality Adlib Tracker (.rad) audio tracker conversion engine.
 * Synthesizes 9-channel Yamaha OPL2 FM chiptune tracker modules into 16-bit stereo WAV.
 */
export const radToWavEngine: Engine = {
	id: "extract:rad-to-wav",

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

		const options: RadConversionOptions = {
			sampleRate,
			stereoSeparation,
		};

		const result = convertRadToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
