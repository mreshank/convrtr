import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVocToWav } from "./parser";

/**
 * Creative Voice (.voc) to WAV conversion engine.
 * Decodes vintage Sound Blaster digital audio recordings, DOS game SFX, and speech clips
 * into universal 16-bit linear PCM WAV files in 100% pure client-side TypeScript.
 */
export const vocToWavEngine: Engine = {
	id: "extract:voc-to-wav",

	async probe() {
		return true; // Pure client-side binary parser & WAV encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertVocToWav(input, onProgress);
	},
};
