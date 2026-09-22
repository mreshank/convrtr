import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAdif } from "./parser";

export * from "./parser";

/**
 * Amateur Radio Log ADIF (.adi / .adif) to CSV & JSON Engine.
 * Extracts contact records from ADIF tags and formats them into structured CSV or JSON.
 */
export const adifToCsvEngine: Engine = {
	id: "extract:adif-to-csv",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		return convertAdif(input, asJson, onProgress);
	},
};
