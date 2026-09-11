import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { decodeAdxToWav } from "./parser";

/**
 * Decodes CRIWARE ADX game audio files into standard uncompressed 16-bit PCM WAV.
 */
export const adxToWavEngine: Engine = {
	id: "extract:adx-to-wav",

	async probe() {
		return true; // Pure client-side mathematical ADPCM decoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return decodeAdxToWav(input, onProgress);
	},
};
