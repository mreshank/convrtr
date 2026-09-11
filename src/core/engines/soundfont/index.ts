import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractSf2ToWavZip } from "./parser";

/**
 * Extracts all instrument samples from a SoundFont 2 (.sf2) file as a ZIP of clean WAV files.
 */
export const sf2ToWavEngine: Engine = {
	id: "extract:sf2-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "EXTRACT");
		const output = extractSf2ToWavZip(input);
		onProgress(1, "DONE");
		return output;
	},
};
