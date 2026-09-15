import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertHmiToWav } from "./parser";
import type { HmiConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Human Machine Interfaces (.hmi) MIDI audio conversion engine.
 * Synthesizes 1990s MS-DOS game music soundtracks into studio-quality 16-bit stereo WAV.
 */
export const hmiToWavEngine: Engine = {
	id: "extract:hmi-to-wav",

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

		const tempo =
			typeof params.tempo === "number"
				? params.tempo
				: Number.parseInt(String(params.tempo ?? "120"), 10) || 120;

		const options: HmiConversionOptions = {
			sampleRate,
			tempo,
		};

		const result = convertHmiToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
