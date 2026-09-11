import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertNistToWav } from "./parser";

/**
 * NIST SPHERE (.sph, .nist) to WAV audio conversion engine.
 * Decodes 16-bit linear PCM (LE/BE), mu-law, and A-law speech audio
 * from DARPA TIMIT, CSR, and linguistic research corpora into universal 16-bit RIFF WAV.
 */
export const nistToWavEngine: Engine = {
	id: "extract:nist-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertNistToWav(input, onProgress);
	},
};
