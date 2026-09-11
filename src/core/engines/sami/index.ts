import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSmiToSrt } from "./parser";

/**
 * SAMI (.smi) to SubRip (.srt) subtitle conversion engine.
 * Converts Microsoft SAMI subtitles (common in Korean drama & anime fansubs)
 * into universal, media-player-compatible SubRip (.srt) files.
 */
export const smiToSrtEngine: Engine = {
	id: "extract:smi-to-srt",

	async probe() {
		return true; // Pure client-side SAMI markup parser & character decoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertSmiToSrt(input, onProgress);
	},
};
