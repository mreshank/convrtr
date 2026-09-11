import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertUlawToWav } from "./parser";
import type { UlawToWavOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Raw G.711 mu-law & A-law telephony audio conversion engine.
 * Expands headerless 8-bit non-linear G.711 voice bitstreams into standard 16-bit linear PCM RIFF WAV.
 */
export const ulawToWavEngine: Engine = {
	id: "extract:ulaw-to-wav",

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
		const codec = params.codec === "alaw" ? "alaw" : "mulaw";
		const options: UlawToWavOptions = { sampleRate, codec };

		const result = convertUlawToWav(input, options, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
