import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { dumpArrowToCsv } from "./parser";

export * from "./parser";

/**
 * Arrow IPC file/stream (.arrow/.feather) to CSV engine.
 * Reads record batches with pure-JS apache-arrow (both container shapes)
 * and writes BOM-headed RFC 4180 CSV — the in-memory-format extract
 * direction.
 */
export const arrowToCsvEngine: Engine = {
	id: "extract:arrow-to-csv",

	async probe() {
		return true; // Pure JS reader, no WASM, no worker needed
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = dumpArrowToCsv(input, onProgress);
		return new TextEncoder().encode(result.csv).buffer as ArrayBuffer;
	},
};
