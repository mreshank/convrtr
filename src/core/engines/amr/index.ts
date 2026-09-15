import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAmrToWav } from "./parser";
import type { AmrConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Adaptive Multi-Rate (.amr) audio speech codec conversion engine.
 * Synthesizes AMR-NB / AMR-WB cellular speech recordings into 16-bit linear PCM WAV audio.
 */
export const amrToWavEngine: Engine = {
	id: "extract:amr-to-wav",

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
				: Number.parseInt(String(params.sampleRate ?? "8000"), 10) || 8000;

		const stereo = Boolean(params.stereo);

		const options: AmrConversionOptions = {
			sampleRate,
			stereo,
		};

		const result = convertAmrToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
