import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { dumpSqliteToZip } from "./parser";

export * from "./parser";
export { MAX_ROWS_PER_TABLE } from "./parser";

/**
 * SQLite database (.sqlite/.db) to ZIP-of-CSVs engine.
 * Opens the database with self-hosted sql.js (WASM fetched only for this
 * tool) and dumps every user table to a BOM-headed RFC 4180 CSV.
 */
export const sqliteToZipEngine: Engine = {
	id: "extract:sqlite-to-zip",

	async probe() {
		return true; // sql.js loads on demand; placement decides, not support
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = await dumpSqliteToZip(input, onProgress);
		const buf = result.zipBytes.buffer.slice(
			result.zipBytes.byteOffset,
			result.zipBytes.byteOffset + result.zipBytes.byteLength,
		);
		return buf as ArrayBuffer;
	},
};
