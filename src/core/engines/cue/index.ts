import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCueToJson } from "./parser";

/**
 * CUE sheet (.cue) to JSON conversion engine.
 * Parses disc image track layouts, album metadata, performers, ISRCs, pregaps,
 * and converts CD-DA 75 fps frames to high-precision timestamps in 100% pure client-side TypeScript.
 */
export const cueToJsonEngine: Engine = {
	id: "extract:cue-to-json",

	async probe() {
		return true; // Pure client-side text parser & JSON encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertCueToJson(input, onProgress);
	},
};
