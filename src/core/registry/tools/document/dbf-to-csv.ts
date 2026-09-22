import type { Tool } from "../../types";

export const dbfToCsv: Tool = {
	id: "document/dbf-to-csv",
	slug: "dbf-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-dbf",
			"application/dbase",
			"application/octet-stream",
		],
		ext: ["dbf"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:dbf-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Table",
				explanation:
					"Reads field descriptors and per-type cells (text, numerics, ISO dates, logicals) into RFC 4180 CSV with an Excel-friendly BOM. Deleted records stay deleted.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "DBF to CSV — dBase Tables to Spreadsheet | convrtr",
		h1: "Convert DBF Database Table to CSV",
		intent:
			"Turn legacy dBase/FoxPro (.dbf) tables — GIS sidecars, old business exports, government open-data — into clean CSV for Excel and pipelines. Field types decoded properly, dates ISO-formatted, memo fields honestly empty. Entirely in your browser.",
		faq: [
			{
				q: "I found a lone .dbf with no program to open it. What is it?",
				a: "A dBase table: rows and typed columns from the 80s onwards, still everywhere as Shapefile sidecars and legacy exports. This reads the field descriptors directly — no database engine needed.",
			},
			{
				q: "Why are some cells empty?",
				a: "Two honest reasons: deleted records (starred in the file) stay deleted, and memo fields live in a sibling .dbt file — without it there's nothing truthful to show.",
			},
			{
				q: "Will Excel open the CSV correctly?",
				a: "Yes — UTF-8 BOM plus proper quoting, dates as YYYY-MM-DD, logicals as true/false.",
			},
			{
				q: "Is my data uploaded anywhere?",
				a: "No. Parsing and CSV writing run entirely inside your browser.",
			},
		],
		related: [
			"document/shp-to-geojson",
			"document/sqlite-to-zip",
			"document/ofx-to-csv",
		],
	},
};
