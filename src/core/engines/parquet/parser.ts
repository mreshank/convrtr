import { parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";

export interface ParquetDumpResult {
	columns: string[];
	rowCount: number;
	csv: string;
}

const MAX_ROWS = 200_000;

function cellValue(v: unknown): string | number | null {
	if (v === null || v === undefined) return null;
	if (
		typeof v === "number" ||
		typeof v === "string" ||
		typeof v === "boolean"
	) {
		return typeof v === "boolean" ? (v ? "true" : "false") : v;
	}
	if (v instanceof Uint8Array) {
		let bin = "";
		for (let i = 0; i < v.length; i += 0x8000) {
			bin += String.fromCharCode(...v.subarray(i, i + 0x8000));
		}
		return btoa(bin);
	}
	if (v instanceof Date) return v.toISOString();
	if (typeof v === "bigint") return v.toString();
	try {
		return JSON.stringify(v) ?? "";
	} catch {
		return String(v);
	}
}

function csvCell(s: string | number | null): string {
	if (s === null) return "";
	const t = typeof s === "number" ? String(s) : s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * Dumps a Parquet file's rows into RFC 4180 CSV, entirely client-side.
 *
 * hyparquet (pure JS, no WASM) reads the footer, decodes all encodings and
 * hands back row objects; the bundled compressors cover snappy/gzip/zstd/
 * brotli/lz4 codecs. Nested lists/structs/maps have no CSV cell type, so
 * they become compact JSON; timestamps become ISO strings; decimals and
 * int64s become exact decimal strings (never float-rounded). Dictionary and
 * delta encodings are a reader detail, not a fidelity question.
 */
export async function dumpParquetToCsv(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<ParquetDumpResult> {
	onProgress?.(0.1, "READ FOOTER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 12) {
		throw new Error("Too small to be Parquet (needs PAR1 magic + footer).");
	}
	const magic = (off: number): string =>
		String.fromCharCode(
			bytes[off] ?? 0,
			bytes[off + 1] ?? 0,
			bytes[off + 2] ?? 0,
			bytes[off + 3] ?? 0,
		);
	if (magic(0) !== "PAR1" || magic(bytes.length - 4) !== "PAR1") {
		throw new Error("Not a Parquet file: missing PAR1 magic bytes.");
	}

	onProgress?.(0.3, "READ ROWS");
	const file = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
	const rows = (await parquetReadObjects({ file, compressors })) as Array<
		Record<string, unknown>
	>;

	if (rows.length > MAX_ROWS) {
		throw new Error(
			`${rows.length.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()}-row browser limit — filter with DuckDB first, then convert the extract.`,
		);
	}

	onProgress?.(0.7, "WRITE CSV");
	const columns: string[] = [];
	for (const row of rows) {
		for (const k of Object.keys(row)) {
			if (!columns.includes(k)) columns.push(k);
		}
	}
	const lines = [columns.map(csvCell).join(",")];
	for (const row of rows) {
		lines.push(columns.map((c) => csvCell(cellValue(row[c]))).join(","));
	}

	onProgress?.(1.0, "COMPLETE");
	return {
		columns,
		rowCount: rows.length,
		csv: `\uFEFF${lines.join("\n")}\n`,
	};
}
