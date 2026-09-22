import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertStyToMid } from "./parser";

export * from "./parser";

/**
 * Yamaha Arranger Keyboard Style (.sty) to Standard MIDI (.mid) Engine.
 * Extracts the raw SMF Type 0/1 sequence from proprietary Yamaha arranger containers,
 * stripping non-standard CASM/OTS chunks for immediate universal playback in DAWs.
 */
export const styToMidEngine: Engine = {
	id: "extract:sty-to-mid",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertStyToMid(input, onProgress);
	},
};
