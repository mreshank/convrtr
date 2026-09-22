import type { Tool } from "../../types";

export const sqliteToZip: Tool = {
	id: "document/sqlite-to-zip",
	slug: "sqlite-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/x-sqlite3",
			"application/vnd.sqlite3",
			"application/octet-stream",
		],
		ext: ["sqlite", "sqlite3", "db", "db3"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:sqlite-to-zip"],
	heavyDownloadMb: 1,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Per-Table CSVs",
				explanation:
					"Reads every user table via SQL and writes one RFC 4180 CSV per table with proper quoting and an Excel-friendly BOM. Values transfer exactly; blobs become base64 cells.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "SQLite to CSV — Database Tables Without Software | convrtr",
		h1: "Convert SQLite Database to CSV",
		intent:
			"Dump every table of a SQLite (.sqlite/.db) database into CSVs without installing anything — app data, browser history, chat backups, research datasets. Real SQL inside your browser via WASM, tables over 200k rows refused safely instead of hanging your tab, nothing uploaded.",
		faq: [
			{
				q: "I have a .db file and no idea what's inside. What do I get?",
				a: "A ZIP with one CSV per user table, each with its real column headers — the fastest possible way to see and search any SQLite database, from app exports to data journalism drops.",
			},
			{
				q: "Why does it need a 1MB download first?",
				a: "SQLite itself is compiled to WebAssembly for this tool — the 1MB engine loads once, on demand, only when you use this converter. Like the video tools' ffmpeg core, the UI asks before spending it.",
			},
			{
				q: "Are blobs, NULLs and weird types handled?",
				a: "NULLs become empty cells, numbers stay numbers, binary blobs become base64 text (CSV has no binary type). Views, triggers and indexes are schema, not data — tables are the dump.",
			},
			{
				q: "My table has millions of rows — will it hang?",
				a: "No: tables over 200,000 rows stop with a clear error telling you to filter in DB Browser first. Browsers are not data warehouses and this tool won't pretend otherwise.",
			},
			{
				q: "Is my database uploaded anywhere?",
				a: "No. The WASM engine runs locally in your browser; your data never touches a server — unlike every online SQLite-to-CSV site.",
			},
		],
		related: [
			"document/ofx-to-csv",
			"document/gedcom-to-csv",
			"document/fit-to-csv",
		],
	},
};
