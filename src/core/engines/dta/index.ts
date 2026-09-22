import { zipSync } from "fflate";
import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseDta } from "./parser";

export * from "./parser";

function csvCell(s: string | number | null): string {
	if (s === null) return "";
	const t = typeof s === "number" ? String(s) : s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function convertDtaToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "READ HEADER");
	const table = parseDta(new Uint8Array(input));
	onProgress?.(0.4, `WRITING ${table.rows.length} ROWS`);
	const entries: Record<string, Uint8Array> = {};
	const head = table.columns.map((c) => csvCell(c.name)).join(",");
	const lines = table.rows.map((row) => row.map(csvCell).join(","));
	entries["data.csv"] = new TextEncoder().encode(
		`\uFEFF${head}\n${lines.join("\n")}\n`,
	);
	if (table.labels.length > 0) {
		const labLines = ["variable,code,label"];
		for (const l of table.labels) {
			labLines.push([l.variable, l.code, l.label].map(csvCell).join(","));
		}
		entries["_labels.csv"] = new TextEncoder().encode(
			`\uFEFF${labLines.join("\n")}\n`,
		);
	}
	const meta = [
		`Stata dataset${table.dataLabel ? `: ${table.dataLabel}` : ""}`,
		`variables: ${table.columns.length}, observations: ${table.rows.length}`,
		"",
		"Columns (name | type | format | label | value-label):",
		...table.columns.map(
			(c) =>
				`- ${c.name} | ${c.type} | ${c.format} | ${c.label} | ${c.valueLabel}`,
		),
		"",
		"Codes stay raw in data.csv; _labels.csv maps them. Converted locally by convrtr.",
		"",
	].join("\n");
	entries["_README.txt"] = new TextEncoder().encode(meta);
	onProgress?.(0.85, "PACK");
	const zipped = zipSync(entries);
	onProgress?.(1.0, "COMPLETE");
	const buf = zipped.buffer.slice(
		zipped.byteOffset,
		zipped.byteOffset + zipped.byteLength,
	);
	return buf as ArrayBuffer;
}

/**
 * Stata dataset (.dta 117/118) to ZIP engine.
 * Tag-walks the dataset into data.csv + _labels.csv + _README.txt —
 * missings, dates, strL and value labels handled, nothing uploaded.
 */
export const dtaToZipEngine: Engine = {
	id: "extract:dta-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDtaToZip(input, onProgress);
	},
};
