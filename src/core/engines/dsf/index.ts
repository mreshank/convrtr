import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDsfToWav } from "./parser";

/**
 * Sony DSF (DSD Stream File) to WAV audio conversion engine.
 * Filters and decimates 1-bit high-resolution Direct Stream Digital audio (DSD64/128/256)
 * into standard 16-bit linear PCM RIFF WAV in-browser.
 */
export const dsfToWavEngine: Engine = {
	id: "extract:dsf-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		const out = await convertDsfToWav(input, onProgress);
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
