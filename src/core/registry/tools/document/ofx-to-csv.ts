import type { Tool } from "../../types";

export const ofxToCsv: Tool = {
	id: "document/ofx-to-csv",
	slug: "ofx-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-ofx",
			"application/ofx",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["ofx", "qfx", "qif"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:ofx-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Transaction Table",
				explanation:
					"Reads every statement transaction (OFX/QFX/QBO blocks or QIF records) into a date/type/amount/name/memo table with proper RFC 4180 quoting and an Excel-friendly BOM.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "OFX to CSV — Bank Statements to Spreadsheet | convrtr",
		h1: "Convert OFX / QFX / QBO / QIF to CSV",
		intent:
			"Turn bank-downloaded OFX, QFX, QBO or legacy QIF statements into a clean CSV for Excel, Google Sheets, accountants and tax prep. Dates normalised, amounts untouched, account IDs kept — entirely in your browser, your finances never uploaded.",
		faq: [
			{
				q: "Which files are accepted?",
				a: "OFX, QFX and QBO (QuickBooks OFX — same SGML statements nearly every bank's download button produces) plus legacy QIF (Quicken Interchange, D/T/P records). All collapse to the same date,type,amount,fitid,name,memo,account table.",
			},
			{
				q: "Will Excel open the CSV correctly?",
				a: "Yes — output carries a UTF-8 BOM so Excel shows international characters with zero mojibake, and quoted fields protect commas inside payee names and memos.",
			},
			{
				q: "Is my financial data uploaded anywhere?",
				a: "No. Parsing and CSV generation run entirely inside your browser — unlike statement-converter sites, your transactions never touch a server.",
			},
			{
				q: "What about PDF bank statements?",
				a: "Scanned/image PDFs need OCR, which browsers cannot do well client-side — this tool covers the structured downloads (OFX/QFX/QBO/QIF), which are exact where PDFs are lossy.",
			},
		],
		related: [
			"document/gedcom-to-csv",
			"document/fit-to-csv",
			"document/vcf-to-csv",
		],
	},
};
