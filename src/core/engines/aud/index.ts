import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAudToWav } from "./parser";
import type { AudToWavOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Westwood Studios AUD (.aud) audio extraction and decoding engine.
 * Converts Command & Conquer, Red Alert, and Dune 2000 WS-ADPCM / IMA-ADPCM audio
 * into clean 16-bit linear PCM RIFF WAV format.
 */
export const audToWavEngine: Engine = {
	id: "extract:aud-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const sampleRateOverride =
			typeof params.sampleRate === "number"
				? params.sampleRate
				: Number.parseInt(String(params.sampleRate ?? "0"), 10) || undefined;

		const options: AudToWavOptions = {
			sampleRateOverride,
		};

		const result = convertAudToWav(input, options, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
