import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDspToWav } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * Nintendo GameCube / Wii DSP ADPCM audio conversion engine.
 * Decodes 4-bit GameCube / Wii DSP ADPCM audio streams into standard 16-bit linear PCM RIFF WAV.
 */
export const dspToWavEngine: Engine = {
	id: "extract:dsp-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = convertDspToWav(input, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
