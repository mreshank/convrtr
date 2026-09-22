import { zipSync } from "fflate";
import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseSav } from "./parser";

export * from "./parser";

function csvCell(s: string | number | null): string {
	if (s === null) return "";
	const t = typeof s === "number" ? String(s) : s;
	return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function convertSavToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "READ DICTIONARY");
	const table = parseSav(new Uint8Array(input));
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
		`SPSS data file${table.fileLabel ? `: ${table.fileLabel}` : ""} (${table.namesLong} long names resolved)`,
		`variables: ${table.columns.length}, observations: ${table.rows.length}`,
		"",
		"Columns (name | type | format | label):",
		...table.columns.map(
			(c) => `- ${c.name} | ${c.type} | ${c.format} | ${c.label}`,
		),
	];
	if (table.documents.length > 0) {
		meta.push("", "File documents:", ...table.documents.map((d) => `> ${d}`));
	}
	meta.push(
		"",
		"Codes stay raw in data.csv; _labels.csv maps them. Converted locally by convrtr.",
		"",
	);
	entries["_README.txt"] = new TextEncoder().encode(meta.join("\n"));
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
 * SPSS Statistics Data File (.sav) to ZIP engine.
 * Reads $FL2/$FL3 dictionaries (bytecode + ZLIB), decodes dates/missings
 * per PSPP semantics, and packs data.csv + _labels.csv + _README.txt.
 */
export const savToZipEngine: Engine = {
	id: "extract:sav-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertSavToZip(input, onProgress);
	},
};
