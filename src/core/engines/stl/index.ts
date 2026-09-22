import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertStlToSrt } from "./parser";

export * from "./parser";

/**
 * Broadcast subtitle (.stl) to SubRip SRT engine.
 * Reads EBU STL binary (GSI + TTI blocks, ISO 6937 Latin path) and Spruce
 * text cues into numbered SRT with millisecond timestamps.
 */
export const stlToSrtEngine: Engine = {
	id: "extract:stl-to-srt",

	async probe() {
		return true; // Pure client-side binary + text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertStlToSrt(input, onProgress);
	},
};
