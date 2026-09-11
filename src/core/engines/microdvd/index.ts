import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMicroDvdToSrt } from "./parser";

/**
 * MicroDVD (.sub) to SubRip (.srt) subtitle conversion engine.
 * Converts frame-based MicroDVD subtitles to standard millisecond-accurate
 * SubRip timestamps with automatic FPS detection and formatting tag normalization.
 */
export const microDvdToSrtEngine: Engine = {
	id: "extract:sub-to-srt",

	async probe() {
		return true; // Pure client-side text state machine parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertMicroDvdToSrt(input, onProgress);
	},
};
