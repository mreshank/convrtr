import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertScc } from "./parser";

export * from "./parser";

/**
 * Scenarist Closed Caption (.scc) to SubRip (.srt) and WebVTT (.vtt) Engine.
 * Converts broadcast Line 21 CEA-608 caption files into standards-compliant SRT and WebVTT subtitles.
 */
export const sccToSrtEngine: Engine = {
	id: "extract:scc-to-srt",

	async probe() {
		return true; // Pure client-side CEA-608 stream decoder
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asVtt = Boolean(params.vtt);
		return convertScc(input, asVtt, onProgress);
	},
};
