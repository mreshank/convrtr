import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertOktToWav } from "./parser";
import type { OktConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Oktalyzer (.okt) Amiga 8-channel audio tracker conversion engine.
 * Synthesizes 4/8-channel Amiga Paula tracker modules into 16-bit stereo WAV.
 */
export const oktToWavEngine: Engine = {
	id: "extract:okt-to-wav",

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
				: Number.parseInt(String(params.stereoSeparation ?? "80"), 10) || 80;

		const loopCount =
			typeof params.loopCount === "number"
				? params.loopCount
				: Number.parseInt(String(params.loopCount ?? "0"), 10) || 0;

		const options: OktConversionOptions = {
			sampleRate,
			stereoSeparation,
			loopCount,
		};

		const result = convertOktToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
