import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCbtToPdf } from "./parser";

export * from "./parser";

/**
 * Comic Book TAR (.cbt) to PDF engine.
 * Reads ustar entries (tolerating gzip-wrapped .tgz content), natural-sorts
 * page images and binds them into a PDF at native resolution via pdf-lib.
 */
export const cbtToPdfEngine: Engine = {
	id: "extract:cbt-to-pdf",

	async probe() {
		return true; // Pure client-side tar reader + pdf-lib
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = await convertCbtToPdf(input, onProgress);
		const buf = result.pdfBytes.buffer.slice(
			result.pdfBytes.byteOffset,
			result.pdfBytes.byteOffset + result.pdfBytes.byteLength,
		);
		return buf as ArrayBuffer;
	},
};
