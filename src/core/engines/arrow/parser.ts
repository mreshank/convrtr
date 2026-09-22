import { tableFromIPC } from "apache-arrow";

export interface ArrowDumpResult {
	columns: string[];
	rowCount: number;
	csv: string;
}

const MAX_ROWS = 200_000;

function cellValue(v: unknown): string | number | null {
	if (v === null || v === undefined) return null;
	if (typeof v === "number" || typeof v === "string") return v;
	if (typeof v === "boolean") return v ? "true" : "false";
	if (typeof v === "bigint") return v.toString();
	if (v instanceof Uint8Array) {
		let bin = "";
		for (let i = 0; i < v.length; i += 0x8000) {
			bin += String.fromCharCode(...v.subarray(i, i + 0x8000));
		}
		return btoa(bin);
	}
	if (v instanceof Date) return v.toISOString();
	if (typeof v === "object" && "toString" in (v as Record<string, unknown>)) {
		// Structs, lists, maps, decimals, timestamps → stable string form.
		try {
			const t = (v as { toString(): string }).toString();
			if (t !== "[object Object]") return t;
			return JSON.stringify(v) ?? "";
		} catch {
			return String(v);
		}
	}
	return String(v);
}

function csvCell(s: string | number | null): string {
	if (s === null) return "";
	const t = typeof s === "number" ? String(s) : s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function isArrowIpc(bytes: Uint8Array): boolean {
	// Stream format opens with a continuation + empty schema message ("ARROW1\0\0" + padding).
	if (
		bytes.length >= 8 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xff &&
		bytes[2] === 0xff &&
		bytes[3] === 0xff
	) {
		return true;
	}
	// File format ends with "ARROW1".
	const n = bytes.length;
	return (
		n >= 6 &&
		bytes[n - 6] === 0x41 &&
		bytes[n - 5] === 0x52 &&
		bytes[n - 4] === 0x52 &&
		bytes[n - 3] === 0x4f &&
		bytes[n - 2] === 0x57 &&
		bytes[n - 1] === 0x31
	);
}

/**
 * Dumps an Arrow IPC file or stream (`.arrow`/`.feather`) into RFC 4180 CSV.
 *
 * apache-arrow (pure JS, no WASM) reads both container shapes — file footer
 * and streaming continuation framing — into a typed table; columns keep
 * their schema names, timestamps stringify to ISO, decimals/int64s stay
 * exact, nested types fall back to stable strings. Same 200k-row browser
 * guard as the parquet and sqlite tools.
 */
export function dumpArrowToCsv(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): ArrowDumpResult {
	onProgress?.(0.1, "READ SCHEMA");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (!isArrowIpc(bytes)) {
		throw new Error(
			"Not Arrow IPC: missing stream framing or the ARROW1 footer.",
		);
	}

	onProgress?.(0.3, "READ BATCHES");
	const table = tableFromIPC(bytes);
	if (table.numRows > MAX_ROWS) {
		throw new Error(
			`${table.numRows.toLocaleString()} rows exceeds the ${MAX_ROWS.toLocaleString()}-row browser limit — slice with DuckDB first, then convert the extract.`,
		);
	}

	onProgress?.(0.6, "WRITE CSV");
	const columns = table.schema.fields.map((f) => f.name);
	const lines = [columns.map(csvCell).join(",")];
	const vectors = columns.map((c) => table.getChild(c));
	for (let r = 0; r < table.numRows; r++) {
		lines.push(vectors.map((v) => csvCell(cellValue(v?.get(r)))).join(","));
	}

	onProgress?.(1.0, "COMPLETE");
	return {
		columns,
		rowCount: table.numRows,
		csv: `\uFEFF${lines.join("\n")}\n`,
	};
}
