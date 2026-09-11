import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVcfToCsv } from "./parser";

/**
 * Parses vCard (.vcf) address book exports into clean, universal RFC 4180 CSV spreadsheets
 * with UTF-8 BOM encoding for Microsoft Excel and Google Sheets.
 */
export const vcfToCsvEngine: Engine = {
	id: "extract:vcf-to-csv",

	async probe() {
		return true; // Pure client-side string/text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertVcfToCsv(input, onProgress);
	},
};
