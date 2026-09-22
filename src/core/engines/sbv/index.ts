import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSbvToSrt } from "./parser";

export * from "./parser";

/**
 * YouTube SubViewer (.sbv) to SubRip SRT engine.
 * Converts dotted timestamps to comma-millis and numbers the cues.
 */
export const sbvToSrtEngine: Engine = {
	id: "extract:sbv-to-srt",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertSbvToSrt(input, onProgress);
	},
};
