import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertIrcamToWav } from "./parser";

/**
 * IRCAM / BICSF / Sound Designer II audio decoder to WAV.
 * Decodes 16-bit linear PCM, 32-bit linear PCM, 32-bit float, and mu-law
 * academic computer music research audio into universal 16-bit linear PCM RIFF WAV.
 */
export const ircamToWavEngine: Engine = {
	id: "extract:ircam-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertIrcamToWav(input, onProgress);
	},
};
