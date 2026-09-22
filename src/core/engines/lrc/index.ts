import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertLrcToSrt } from "./parser";

export * from "./parser";

/**
 * Karaoke lyrics (.lrc) to SubRip SRT engine.
 * Fans out timestamped lyric lines (with offset + word-timing support)
 * into numbered SRT cues, chained end-to-start.
 */
export const lrcToSrtEngine: Engine = {
	id: "extract:lrc-to-srt",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertLrcToSrt(input, onProgress);
	},
};
