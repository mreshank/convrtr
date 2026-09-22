import { readDbf } from "../shp/parser";

function csvCell(s: string | number | boolean | null): string {
	if (s === null) return "";
	const t =
		typeof s === "number"
			? String(s)
			: typeof s === "boolean"
				? s
					? "true"
					: "false"
				: s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * Converts a standalone dBase table (`.dbf`) into RFC 4180 CSV.
 *
 * dBase III/IV files outlive every app that made them — GIS sidecars,
 * legacy business exports, FoxPro dumps, government open-data. The reader
 * (shared with the Shapefile engine) decodes the field descriptors and
 * per-type cells: character text, numerics, ISO dates from YYYYMMDD,
 * logicals as true/false. Deleted (starred) records stay deleted, memo
 * fields (which live in a sibling .dbt) read as empty rather than garbage.
 */
export function convertDbfToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading table...");
	const table = readDbf(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${table.rows.length} rows...`);
	const lines = [table.fields.map(csvCell).join(",")];
	for (const row of table.rows) {
		lines.push(table.fields.map((f) => csvCell(row[f] ?? null)).join(","));
	}
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`\uFEFF${lines.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
