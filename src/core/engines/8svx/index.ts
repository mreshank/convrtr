import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convert8svxToWav } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * Commodore Amiga IFF 8SVX (8-bit Sampled Voice) audio conversion engine.
 * Decodes Amiga linear 8-bit PCM and 4-bit Fibonacci-delta compressed sound effects
 * into standard, playable 16-bit Linear PCM RIFF WAV audio files.
 */
export const eightSvxToWavEngine: Engine = {
	id: "extract:8svx-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = convert8svxToWav(input, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
