import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDjiToCsv } from "./parser";

export * from "./parser";

/**
 * DJI drone SRT telemetry to CSV engine.
 * Reads bracket + legacy per-frame cues into a union-column flight log —
 * the mapping/GPX pipeline input, produced entirely client-side.
 */
export const djiToCsvEngine: Engine = {
	id: "extract:dji-to-csv",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDjiToCsv(input, onProgress);
	},
};
