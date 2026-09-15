import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRolToWav } from "./parser";
import type { RolConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * AdLib Visual Composer (.rol) conversion engine.
 * Emulates Yamaha YM3812 (OPL2) FM synthesis hardware to synthesize MS-DOS AdLib song files into 16-bit stereo WAV.
 */
export const rolToWavEngine: Engine = {
	id: "extract:rol-to-wav",

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

		const tempo =
			typeof params.tempo === "number"
				? params.tempo
				: Number.parseInt(String(params.tempo ?? "120"), 10) || 120;

		const options: RolConversionOptions = {
			sampleRate,
			tempo,
		};

		const result = convertRolToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
