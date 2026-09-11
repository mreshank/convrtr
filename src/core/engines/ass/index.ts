import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAssToSrt } from "./parser";

/**
 * Advanced SubStation Alpha (.ass / .ssa) to SubRip (.srt) conversion engine.
 * Converts styled anime, karaoke, and video subtitles into universal SubRip format,
 * stripping override tags and vector drawings while preserving italic/bold markup.
 */
export const assToSrtEngine: Engine = {
	id: "extract:ass-to-srt",

	async probe() {
		return true; // Pure client-side text state machine
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAssToSrt(input, onProgress);
	},
};
