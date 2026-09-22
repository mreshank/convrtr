import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGpmfToCsv } from "./parser";

export * from "./parser";

/**
 * GoPro GPMF telemetry (.bin) to CSV engine.
 * Walks DEVC/STRM boxes, scales GPS5 fixes by SCAL and writes a GPS track —
 * the mapping/GPX pipeline input, produced entirely client-side.
 */
export const gpmfToCsvEngine: Engine = {
	id: "extract:gpmf-to-csv",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertGpmfToCsv(input, onProgress);
	},
};
