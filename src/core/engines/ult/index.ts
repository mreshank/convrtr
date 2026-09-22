import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertUltToWav } from "./parser";
import type { UltConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * UltraTracker module (.ult) synthesizer and conversion engine.
 * Renders dual-command patterns, looped 8/16-bit samples and translated
 * effects into 16-bit linear stereo WAV.
 */
export const ultToWavEngine: Engine = {
	id: "extract:ult-to-wav",

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

		const options: UltConversionOptions = { sampleRate };
		const result = convertUltToWav(input, options, onProgress);
		return result.wavBytes.buffer.slice(
			result.wavBytes.byteOffset,
			result.wavBytes.byteOffset + result.wavBytes.byteLength,
		) as ArrayBuffer;
	},
};
