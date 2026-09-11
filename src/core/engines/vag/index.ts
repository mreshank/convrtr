import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVagToWav } from "./parser";
import type { VagToWavOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Sony PlayStation 1 (.vag) audio conversion engine.
 * Decodes 16-byte PSX SPU-ADPCM blocks with 4-bit nibbles and 2-pole IIR prediction filters
 * into standard 16-bit linear PCM RIFF WAV audio.
 */
export const vagToWavEngine: Engine = {
	id: "extract:vag-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const normalize = params.normalize === true || params.normalize === "true";
		const options: VagToWavOptions = { normalize };

		const result = convertVagToWav(input, options, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
