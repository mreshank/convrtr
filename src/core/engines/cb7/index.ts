import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCb7ToPdf } from "./parser";

export * from "./parser";

/**
 * Comic Book 7-Zip (.cb7) to PDF engine.
 * Unpacks with full 7-Zip (WASM, fetched on demand) and binds pages
 * through the shared natural-sorted native-resolution PDF pipeline.
 */
export const cb7ToPdfEngine: Engine = {
	id: "extract:cb7-to-pdf",

	async probe() {
		return true; // 7-Zip core loads on demand; placement decides, not support
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = await convertCb7ToPdf(input, onProgress);
		const buf = result.pdfBytes.buffer.slice(
			result.pdfBytes.byteOffset,
			result.pdfBytes.byteOffset + result.pdfBytes.byteLength,
		);
		return buf as ArrayBuffer;
	},
};
