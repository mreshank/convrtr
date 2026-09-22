import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertStmToWav } from "./parser";
import type { StmConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Scream Tracker 2 module (.stm) synthesizer and conversion engine.
 * Renders 4-channel patterns, looped 8-bit samples and ST2 effects into
 * 16-bit linear stereo WAV (dual-mono, as the original hardware was).
 */
export const stmToWavEngine: Engine = {
	id: "extract:stm-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const sampleRate =
			typeof params.sampleRate === "number"
				? params.sampleRate
				: Number.parseInt(String(params.sampleRate ?? "44100"), 10) || 44100;

		const options: StmConversionOptions = { sampleRate };
		const result = convertStmToWav(input, options, onProgress);
		return result.wavBytes.buffer.slice(
			result.wavBytes.byteOffset,
			result.wavBytes.byteOffset + result.wavBytes.byteLength,
		) as ArrayBuffer;
	},
};
