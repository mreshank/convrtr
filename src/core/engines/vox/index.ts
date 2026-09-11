import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVoxToWav } from "./parser";
import type { VoxToWavOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Dialogic / OKI ADPCM (.vox) audio conversion engine.
 * Decodes headerless 4-bit Dialogic OKI ADPCM voice streams into standard 16-bit linear PCM RIFF WAV.
 */
export const voxToWavEngine: Engine = {
	id: "extract:vox-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const sampleRate = Number(params.sampleRate ?? 8000) || 8000;
		const options: VoxToWavOptions = { sampleRate };

		const result = convertVoxToWav(input, options, onProgress);
		return result.wavBytes.slice().buffer as ArrayBuffer;
	},
};
