import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCafToWav } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * Apple Core Audio Format (.caf) to WAV conversion engine.
 * Converts Apple LPCM high-capacity audio captures from macOS, iOS,
 * GarageBand, and Logic Pro into universal standard 16-bit RIFF WAV.
 */
export const cafToWavEngine: Engine = {
	id: "extract:caf-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.1, "Reading Apple CAF chunks");
		const result = convertCafToWav(input);
		onProgress(0.8, "Encoding RIFF WAV");
		const out = result.wavBuffer;
		onProgress(1.0, "Conversion complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
