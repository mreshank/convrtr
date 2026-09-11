import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractGoodnotesToPdf } from "./parser";

/**
 * Extracts and compiles a GoodNotes (.goodnotes) notebook into a standard PDF document.
 * Merges vector PDF pages sequentially or embeds rendered page artwork with zero loss.
 */
export const goodnotesToPdfEngine: Engine = {
	id: "extract:goodnotes-to-pdf",

	async probe() {
		return true; // Pure client-side zip parsing and PDF generation
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return await extractGoodnotesToPdf(input, onProgress);
	},
};
