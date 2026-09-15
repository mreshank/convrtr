import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAmfToWav } from "./parser";
import type { AmfConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Advanced Music Format (.amf) to 16-bit 44.1kHz stereo WAV audio synthesis engine.
 */
export const amfToWavEngine: Engine = {
	id: "extract:amf-to-wav",

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

		const options: AmfConversionOptions = {
			sampleRate:
				Number.isNaN(sampleRate) || sampleRate <= 0 ? 44100 : sampleRate,
			stereoSeparation: Number.isNaN(stereoSeparation) ? 0.8 : stereoSeparation,
		};

		const result = convertAmfToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
