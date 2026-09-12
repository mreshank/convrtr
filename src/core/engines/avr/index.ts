import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAvrToWav } from "./parser";
import type { AvrToWavOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Atari ST Audio Visual Research (.avr) digital audio conversion engine.
 * Decodes 8-bit and 16-bit mono/stereo samples into standard 16-bit linear PCM WAV.
 */
export const avrToWavEngine: Engine = {
	id: "extract:avr-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const normalize = params.normalize === true || params.normalize === "true";
		const options: AvrToWavOptions = { normalize };
		const result = convertAvrToWav(input, options, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
