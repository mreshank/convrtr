import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertIcsToCsv } from "./parser";

export * from "./parser";

/**
 * iCalendar (.ics) to CSV engine.
 * Unfolds RFC 5545 lines and flattens events to a spreadsheet table —
 * dates verbatim, recurrence untouched, nothing uploaded.
 */
export const icsToCsvEngine: Engine = {
	id: "extract:ics-to-csv",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertIcsToCsv(input, onProgress);
	},
};
