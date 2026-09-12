import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertItToWav } from "./parser";
import type { ItConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Impulse Tracker (.it) to 16-bit stereo WAV synthesis engine.
 */
export const itToWavEngine: Engine = {
	id: "extract:it-to-wav",

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
				: typeof params.sampleRate === "string"
					? parseInt(params.sampleRate, 10)
					: 44100;

		const panningSeparation =
			typeof params.panningSeparation === "number"
				? params.panningSeparation
				: typeof params.panningSeparation === "string"
					? parseFloat(params.panningSeparation)
					: 0.7;

		const options: ItConversionOptions = {
			sampleRate,
			panningSeparation,
		};

		const result = convertItToWav(input, options, onProgress);
		return result.wavBytes.buffer as ArrayBuffer;
	},
};
