import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertBankToCsv } from "./parser";

export * from "./parser";

/**
 * Bank export (OFX/QFX/QIF) to CSV engine.
 * Collapses statement transactions into a spreadsheet-ready
 * date/type/amount/name/memo table with an Excel-friendly UTF-8 BOM.
 */
export const ofxToCsvEngine: Engine = {
	id: "extract:ofx-to-csv",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertBankToCsv(input, onProgress);
	},
};
