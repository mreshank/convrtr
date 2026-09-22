import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDbfToCsv } from "./parser";

export * from "./parser";

/**
 * dBase table (.dbf) to CSV engine.
 * Reuses the Shapefile engine's dBase-III reader for standalone tables —
 * GIS sidecars, FoxPro dumps, legacy business exports.
 */
export const dbfToCsvEngine: Engine = {
	id: "extract:dbf-to-csv",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDbfToCsv(input, onProgress);
	},
};
