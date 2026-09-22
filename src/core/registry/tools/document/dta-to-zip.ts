import type { Tool } from "../../types";

export const dtaToZip: Tool = {
	id: "document/dta-to-zip",
	slug: "dta-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-stata-dta", "application/octet-stream"],
		ext: ["dta"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:dta-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Dataset Archive",
				explanation:
					"Reads every observation with Stata types, missings, dates and value labels into data.csv + _labels.csv + _README.txt. Codes stay raw; labels map separately.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "DTA to CSV — Stata Datasets Without Stata | convrtr",
		h1: "Convert Stata (.dta) Dataset to CSV",
		intent:
			"Free observations out of Stata 117/118 (.dta) datasets into CSV — extended missings, %t dates, strL long strings and value-label mappings preserved, no licence needed. data.csv + _labels.csv + _README.txt, entirely in your browser.",
		faq: [
			{
				q: "I left academia and lost Stata. Is my dissertation data gone?",
				a: "No — this reads 117/118 datasets directly: every variable becomes a CSV column with real headers, dates become ISO, and value labels export to a separate mapping so 0/1 codes stay joinable.",
			},
			{
				q: "What happens to missing values?",
				a: "They survive as Stata writes them: . for system-missing, .a–.z for extended — never silently zeroed or blanked, which would corrupt statistics.",
			},
			{
				q: "What about value labels like 0='no', 1='yes'?",
				a: "Codes stay raw in data.csv (analysis-safe) and _labels.csv maps every code to its label per variable — the haven/R convention, without needing R.",
			},
			{
				q: "Which Stata versions are supported?",
				a: "Formats 117 (Stata 13) and 118 (Stata 14/15, the default for a decade). Older files: open once anywhere and re-save as 118; v119 (32k+ variables) is refused with guidance.",
			},
			{
				q: "Is my dataset uploaded anywhere?",
				a: "No. Tag-walking, decoding and zipping run entirely inside your browser — survey microdata stays yours.",
			},
		],
		related: [
			"document/sqlite-to-zip",
			"document/mat-to-zip",
			"document/parquet-to-csv",
		],
	},
};
