import type { Tool } from "../../types";

export const parquetToCsv: Tool = {
	id: "document/parquet-to-csv",
	slug: "parquet-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/vnd.apache.parquet", "application/octet-stream"],
		ext: ["parquet", "parq"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:parquet-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Row Dump",
				explanation:
					"Reads every row group with a pure-JS reader (all codecs, all encodings) into RFC 4180 CSV with an Excel-friendly BOM. Values transfer exactly; nested data becomes compact JSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Parquet to CSV — Data Lake Files to Spreadsheet | convrtr",
		h1: "Convert Parquet to CSV",
		intent:
			"Turn Apache Parquet columnar files into CSV for Excel, pandas and data pipelines — no Python, no Spark, no upload. Pure-JS reader handles snappy/gzip/zstd/brotli codecs and dictionary encodings; int64s stay exact, nested data becomes JSON. Entirely in your browser.",
		faq: [
			{
				q: "I downloaded a .parquet and can't open it. What is it?",
				a: "The data-lake standard: columnar, compressed, typed — and unreadable without tooling. This reads the footer schema, decodes every row group and hands you a plain CSV with the same columns.",
			},
			{
				q: "Do I need to install Python or DuckDB?",
				a: "No — the reader is pure JavaScript running locally. For giant files (200k+ rows) filter in DuckDB first; browsers are not warehouses and this tool says so instead of hanging.",
			},
			{
				q: "What happens to nested lists, timestamps and decimals?",
				a: "Lists/structs/maps become compact JSON cells, timestamps become ISO strings, decimals and int64s stay exact decimal strings (never float-rounded). Blobs become base64.",
			},
			{
				q: "Is my dataset uploaded anywhere?",
				a: "No. Footer parsing, codec decompression and CSV writing all run inside your browser.",
			},
		],
		related: [
			"document/sqlite-to-zip",
			"document/ofx-to-csv",
			"document/fit-to-csv",
		],
	},
};
