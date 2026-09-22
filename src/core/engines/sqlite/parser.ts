import { zipSync } from "fflate";
import type { SqlJsDatabase } from "sql.js";

export interface SqliteDumpResult {
	tableCount: number;
	rowCount: number;
	zipBytes: Uint8Array;
}

/** Guard against hanging the tab on hundred-million-row tables. */
export const MAX_ROWS_PER_TABLE = 200_000;

type SqlJsStatic = {
	Database: new (data?: Uint8Array) => SqlJsDatabase;
};

export type { SqlJsDatabase, SqlJsStatic };

let cached: Promise<SqlJsStatic> | null = null;

/** Shared sql.js loader (self-hosted WASM) for SQLite-family engines. */
export function loadSqlJs(): Promise<SqlJsStatic> {
	if (!cached) {
		cached = (async () => {
			const { default: initSqlJs } = await import("sql.js");
			// In node/vitest sql.js finds its own binary; in the browser the
			// binary is self-hosted under /sql-wasm (see copy-sqljs-wasm.mjs).
			const config =
				typeof window === "undefined"
					? undefined
					: { locateFile: (file: string) => `/sql-wasm/${file}` };
			return initSqlJs(config);
		})();
	}
	return cached;
}

export function resetSqlJsForTests(): void {
	cached = null;
}

function quoteIdent(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function csvCell(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "";
	const s = typeof value === "number" ? String(value) : value;
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function blobToBase64(bytes: Uint8Array): string {
	let bin = "";
	const CHUNK = 0x8000;
	for (let i = 0; i < bytes.length; i += CHUNK) {
		bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
	}
	// btoa exists in browsers and node 16+; manual fallback is unnecessary.
	return btoa(bin);
}

function listTables(db: SqlJsDatabase): string[] {
	const res = db.exec(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
	);
	const rows = res[0]?.values ?? [];
	const names: string[] = [];
	for (const row of rows) {
		if (typeof row[0] === "string" && row[0]) names.push(row[0]);
	}
	return names;
}

function dumpTable(
	db: SqlJsDatabase,
	table: string,
): { csv: string; rows: number } {
	const quoted = quoteIdent(table);
	const stmt = db.prepare(`SELECT * FROM ${quoted}`);
	try {
		const columns = stmt.getColumnNames();
		const lines = [columns.map(csvCell).join(",")];
		let count = 0;
		while (stmt.step()) {
			if (count >= MAX_ROWS_PER_TABLE) {
				throw new Error(
					`Table "${table}" exceeds the ${MAX_ROWS_PER_TABLE.toLocaleString()}-row browser limit — filter it in DB Browser for SQLite first, then convert the extract.`,
				);
			}
			const values = stmt
				.get()
				.map((v) =>
					v instanceof Uint8Array
						? blobToBase64(v)
						: (v as string | number | null),
				);
			lines.push(values.map(csvCell).join(","));
			count++;
		}
		return { csv: `\uFEFF${lines.join("\n")}\n`, rows: count };
	} finally {
		stmt.free();
	}
}

/**
 * Dumps every user table of a SQLite database (`.sqlite`/`.db`) into a ZIP
 * of per-table RFC 4180 CSVs, entirely client-side via sql.js.
 *
 * Blobs become base64 cells (CSV has no binary type); views, triggers and
 * indexes are schema, not data, and are honestly out of scope for a table
 * dump. Corrupt or non-SQLite files fail on the magic check with a plain
 * error instead of a wasm crash.
 */
export async function dumpSqliteToZip(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<SqliteDumpResult> {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	const magic = new TextDecoder("ascii").decode(bytes.subarray(0, 16));
	if (!magic.startsWith("SQLite format 3")) {
		throw new Error(
			"Not a SQLite database: missing the `SQLite format 3` magic. (.db files from other engines — Berkeley DB, Realm, LevelDB — are different formats.)",
		);
	}

	onProgress?.(0.15, "LOAD ENGINE");
	const SQL = await loadSqlJs();
	const db = new SQL.Database(bytes);
	try {
		onProgress?.(0.3, "LIST TABLES");
		const tables = listTables(db);
		if (tables.length === 0) {
			throw new Error("Database holds no user tables (only SQLite internals).");
		}

		const entries: Record<string, Uint8Array> = {};
		let totalRows = 0;
		for (let i = 0; i < tables.length; i++) {
			const table = tables[i] ?? "";
			onProgress?.(0.3 + (i / tables.length) * 0.55, `DUMP ${table}`);
			const { csv, rows } = dumpTable(db, table);
			entries[`${table}.csv`] = new TextEncoder().encode(csv);
			totalRows += rows;
		}

		onProgress?.(0.9, "PACK");
		const zipBytes = zipSync(entries);
		onProgress?.(1.0, "COMPLETE");
		return { tableCount: tables.length, rowCount: totalRows, zipBytes };
	} finally {
		db.close();
	}
}
