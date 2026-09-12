import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPtmToWav } from "./parser";
import type { PtmConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * PolyTracker (.ptm) to 16-bit 44.1kHz stereo WAV audio synthesis engine.
 */
export const ptmToWavEngine: Engine = {
	id: "extract:ptm-to-wav",

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

		const options: PtmConversionOptions = {
			sampleRate:
				Number.isNaN(sampleRate) || sampleRate <= 0 ? 44100 : sampleRate,
		};

		const result = convertPtmToWav(input, options, onProgress);
		return result.wavBytes.buffer as ArrayBuffer;
	},
};
