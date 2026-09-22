import type { Tool } from "../../types";

export const arrowToCsv: Tool = {
	id: "document/arrow-to-csv",
	slug: "arrow-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.apache.arrow.file",
			"application/vnd.apache.arrow.stream",
			"application/octet-stream",
		],
		ext: ["arrow", "feather"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:arrow-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Table Dump",
				explanation:
					"Reads record batches with pure-JS apache-arrow (file and stream shapes) into RFC 4180 CSV with an Excel-friendly BOM. Values transfer exactly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Arrow to CSV — In-Memory Data to Spreadsheet | convrtr",
		h1: "Convert Arrow / Feather to CSV",
		intent:
			"Turn Apache Arrow IPC files and Feather files into CSV for Excel, pandas and pipelines — no Python, no upload. Both container shapes read locally with exact decimals, ISO timestamps and JSON-nested cells. Entirely in your browser.",
		faq: [
			{
				q: "Arrow file vs Feather vs stream — which is this?",
				a: "All of them: Feather v2 is Arrow IPC file format, and the reader also accepts the streaming framing. Drop any of them; the container is auto-detected.",
			},
			{
				q: "Do I need pyarrow installed?",
				a: "No — the reader is pure JavaScript running locally. For 200k+ row tables, slice in DuckDB first; browsers are not warehouses and this tool says so instead of hanging.",
			},
			{
				q: "What happens to nested and temporal types?",
				a: "Structs/lists/maps become stable strings (JSON where unambiguous), timestamps become ISO strings, decimals and int64s stay exact. Dictionaries decode transparently.",
			},
			{
				q: "Is my dataset uploaded anywhere?",
				a: "No. Batch reading and CSV writing all run inside your browser.",
			},
		],
		related: [
			"document/parquet-to-csv",
			"document/sqlite-to-zip",
			"document/ofx-to-csv",
		],
	},
};
