import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { dumpParquetToCsv } from "./parser";

export * from "./parser";

/**
 * Parquet columnar file to CSV engine.
 * Reads rows with pure-JS hyparquet (all codecs via hyparquet-compressors)
 * and writes BOM-headed RFC 4180 CSV — the data-lake extract direction.
 */
export const parquetToCsvEngine: Engine = {
	id: "extract:parquet-to-csv",

	async probe() {
		return true; // Pure JS reader, no WASM, no worker needed
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = await dumpParquetToCsv(input, onProgress);
		return new TextEncoder().encode(result.csv).buffer as ArrayBuffer;
	},
};
