import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAlsToJson } from "./parser";

export * from "./parser";

/**
 * Ableton Live Set (.als) project-intelligence engine.
 * Gunzips the Live Set XML and summarises tempo, time signature, tracks,
 * devices/plugins and referenced sample files as structured JSON — no
 * Ableton Live install required.
 */
export const alsToJsonEngine: Engine = {
	id: "extract:als-to-json",

	async probe() {
		return true; // Pure client-side gzip + text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAlsToJson(input, onProgress);
	},
};
