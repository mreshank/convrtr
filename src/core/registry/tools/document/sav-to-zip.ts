import type { Tool } from "../../types";

export const savToZip: Tool = {
	id: "document/sav-to-zip",
	slug: "sav-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-spss-sav", "application/octet-stream"],
		ext: ["sav"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:sav-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Dataset Archive",
				explanation:
					"Reads every case with SPSS types, missings, dates and value labels into data.csv + _labels.csv + _README.txt. ZLIB files inflate in-browser; codes stay raw.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "SAV to CSV — SPSS Data Without SPSS | convrtr",
		h1: "Convert SPSS (.sav) Data to CSV",
		intent:
			"Free cases out of IBM SPSS (.sav) files into CSV — bytecode and ZLIB compression, SPSS-epoch dates, discrete and range missings, value-label mappings, long names. No licence, no upload. data.csv + _labels.csv + _README.txt, entirely in your browser.",
		faq: [
			{
				q: "I left the university and lost SPSS. Is my survey data gone?",
				a: "No — this reads $FL2 and $FL3 (ZLIB) files directly: every variable becomes a CSV column with real headers, dates become ISO, and value labels export separately so codes stay joinable.",
			},
			{
				q: "What happens to missing values?",
				a: "System-missing becomes ., discrete and ranged missings resolve per the dictionary — never silently zeroed, which would corrupt statistics.",
			},
			{
				q: "Do variable and value labels survive?",
				a: "Variable labels ride in _README's column docs; value-label sets become _labels.csv (variable, code, label) — the haven/R convention without needing R.",
			},
			{
				q: "Is my dataset uploaded anywhere?",
				a: "No. Dictionary parsing, inflation, decoding and zipping run entirely inside your browser — survey microdata stays yours.",
			},
		],
		related: [
			"document/dta-to-zip",
			"document/sqlite-to-zip",
			"document/parquet-to-csv",
		],
	},
};
