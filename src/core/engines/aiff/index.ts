import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAiffToWav } from "./parser";

/**
 * Apple AIFF (.aif / .aiff) to WAV conversion engine.
 * Converts vintage Apple Macintosh uncompressed Big-Endian PCM audio into universal RIFF WAV.
 */
export const aiffToWavEngine: Engine = {
	id: "extract:aiff-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAiffToWav(input, onProgress);
	},
};

export {
	convertAiffToWav,
	parseAiff,
	readExtended80,
	writeExtended80,
} from "./parser";
