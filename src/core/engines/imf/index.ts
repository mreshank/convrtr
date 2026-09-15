import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertImfToWav } from "./parser";
import type { ImfConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * id Software Music Format (.imf) conversion engine.
 * Emulates Yamaha YM3812 (OPL2) FM synthesis hardware to convert MS-DOS Commander Keen / Wolfenstein 3D songs into 16-bit stereo WAV.
 */
export const imfToWavEngine: Engine = {
	id: "extract:imf-to-wav",

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

		const clockRate =
			typeof params.clockRate === "number"
				? params.clockRate
				: Number.parseInt(String(params.clockRate ?? "560"), 10) || 560;

		const options: ImfConversionOptions = {
			sampleRate,
			clockRate,
		};

		const result = convertImfToWav(input, options, onProgress);
		return result.wavBuffer;
	},
};
