import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSilkToWav } from "./parser";

/**
 * Skype & WeChat Silk v3 (.silk / .slk) audio conversion engine.
 * Decodes voice messages and audio memos compressed with Skype's Silk v3 speech codec
 * into standard, playable 16-bit Linear PCM WAV audio files.
 */
export const silkToWavEngine: Engine = {
	id: "extract:silk-to-wav",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertSilkToWav(input, onProgress);
	},
};
