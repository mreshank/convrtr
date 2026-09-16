import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXmiToWav } from "./parser";
import type { XmiConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Miles Sound System Extended MIDI (.xmi) conversion engine.
 * Converts classic 1990s MS-DOS PC game music tracks into 16-bit linear stereo WAV audio.
 */
export const xmiToWavEngine: Engine = {
	id: "extract:xmi-to-wav",

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

		const options: XmiConversionOptions = {
			sampleRate,
			tempo,
		};

		const result = convertXmiToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
