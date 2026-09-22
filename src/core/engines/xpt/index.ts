import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXptToCsv } from "./parser";

export * from "./parser";

/**
 * SAS Transport v5 (.xpt) to CSV engine.
 * Walks the 80-byte card stream (TS-140), converts IBM hex floats exactly
 * (truncated widths, missing-value first bytes) and writes BOM-headed CSV.
 */
export const xptToCsvEngine: Engine = {
	id: "extract:xpt-to-csv",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertXptToCsv(input, onProgress);
	},
};
