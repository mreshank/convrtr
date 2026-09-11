import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXmToWav } from "./parser";
import type { XmConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * FastTracker II Extended Module (.xm) audio synthesizer and conversion engine.
 * Renders multi-channel tracker patterns, instruments, and delta-encoded samples into 16-bit linear stereo WAV.
 */
export const xmToWavEngine: Engine = {
	id: "extract:xm-to-wav",

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
				: Number.parseFloat(String(params.stereoSeparation ?? "0.7")) || 0.7;

		const options: XmConversionOptions = {
			sampleRate,
			stereoSeparation,
		};

		const result = convertXmToWav(input, options, onProgress);
		return result.wavBuffer.slice().buffer as ArrayBuffer;
	},
};
