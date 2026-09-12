import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertFarToWav } from "./parser";
import type { FarConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Farandole Composer (.far) to 16-bit 44.1kHz stereo WAV audio synthesis engine.
 */
export const farToWavEngine: Engine = {
	id: "extract:far-to-wav",

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
				: Number.parseInt(String(params.sampleRate ?? "44100"), 10);

		const stereoSeparation =
			typeof params.stereoSeparation === "number"
				? params.stereoSeparation
				: Number.parseFloat(String(params.stereoSeparation ?? "0.8"));

		const options: FarConversionOptions = {
			sampleRate:
				Number.isNaN(sampleRate) || sampleRate <= 0 ? 44100 : sampleRate,
			stereoSeparation: Number.isNaN(stereoSeparation) ? 0.8 : stereoSeparation,
		};

		const result = convertFarToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
