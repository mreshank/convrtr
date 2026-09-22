import type { Tool } from "../../types";

export const adifToCsv: Tool = {
	id: "document/adif-to-csv",
	slug: "adif-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-adif", "text/plain", "application/octet-stream"],
		ext: ["adi", "adif"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:adif-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "csv",
		presets: [
			{
				id: "csv",
				label: "CSV Spreadsheet (.csv)",
				explanation:
					"Converts amateur radio QSO log records into standard RFC 4180 CSV for Excel, Numbers, and Google Sheets.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Structured JSON (.json)",
				explanation:
					"Formats contact logs and header tags as typed JSON objects for custom ham radio applications and databases.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "ADIF to CSV — Convert Amateur Radio Log to Spreadsheet | convrtr",
		h1: "Convert ADIF Amateur Radio Log to CSV",
		intent:
			"Convert Amateur Data Interchange Format (.adi, .adif) ham radio log files into clean RFC 4180 CSV spreadsheets and JSON. Open contact logs directly in Excel, Google Sheets, or custom logging software.",
		faq: [
			{
				q: "What is an ADIF file?",
				a: "ADIF (Amateur Data Interchange Format) is the open international standard used by amateur radio operators to log two-way radio communications (QSOs), frequencies, signal reports, modes, and gridsquares.",
			},
			{
				q: "Can I open the resulting CSV in Microsoft Excel or Google Sheets?",
				a: "Yes. The generated CSV strictly adheres to RFC 4180 with proper quoting and UTF-8 encoding, making it compatible with all modern spreadsheet applications.",
			},
			{
				q: "Which ADIF tags are extracted?",
				a: "All standard ADIF fields including callsign, QSO date, time, band, mode, RST sent/received, frequency, operator name, QTH, and grid locator are parsed.",
			},
			{
				q: "Is my logbook data private?",
				a: "Yes. All processing occurs entirely in client-side Web Workers. Your personal station records and callsigns are never transmitted over the internet.",
			},
		],
		related: [
			"document/vcf-to-csv",
			"document/fit-to-csv",
			"document/ofx-to-csv",
		],
	},
};
