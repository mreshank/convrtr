import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCbzToPdf } from "./parser";

/**
 * Comic Book ZIP (.cbz) to PDF extraction and binding engine.
 * Unpacks comic book archives, sorts pages in natural reading order,
 * and compiles them into a unified PDF document.
 */
export const cbzToPdfEngine: Engine = {
	id: "extract:cbz-to-pdf",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = await convertCbzToPdf(input, {}, onProgress);
		return result.pdfBytes.slice().buffer as ArrayBuffer;
	},
};

export { convertCbzToPdf, naturalSort } from "./parser";
export type * from "./types";
