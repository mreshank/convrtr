import type { Tool } from "../../types";

export const xptToCsv: Tool = {
	id: "document/xpt-to-csv",
	slug: "xpt-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-sas-xport", "application/octet-stream"],
		ext: ["xpt", "xport"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:xpt-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Dataset",
				explanation:
					"Reads NAMESTR descriptors and converts IBM hex floats exactly (missing bytes honored, truncated widths padded) into BOM-headed CSV. Dates detected from display formats.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "XPT to CSV — SAS Transport Files to Spreadsheet | convrtr",
		h1: "Convert SAS XPORT (.xpt) to CSV",
		intent:
			"Turn SAS Transport v5 (.xpt) datasets — FDA submissions, clinical trials, government data — into CSV with exact IBM-float conversion, missing-value fidelity and date detection. No SAS licence, nothing uploaded.",
		faq: [
			{
				q: "I downloaded FDA/clinical data as .xpt and can't open it. What now?",
				a: "Drop it here: every variable becomes a CSV column with its SAS label documented in the file header, numerics converted bit-exact from IBM hex floats, dates detected from display formats.",
			},
			{
				q: "How are missing values handled?",
				a: "SAS . / ._ / .A–.Z survive as written (never silently zeroed), character fields trim trailing blanks — the same contract as R's foreign package.",
			},
			{
				q: "What about value labels and v8 files?",
				a: "XPORT never stores value-label definitions (only SAS does) — documented openly, not faked. v8 LIBV8 transport is refused with re-export guidance; v5 covers FDA and nearly all shared data.",
			},
			{
				q: "Is my dataset uploaded anywhere?",
				a: "No. Card-stream parsing, float conversion and CSV writing all run inside your browser.",
			},
		],
		related: [
			"document/dta-to-zip",
			"document/sav-to-zip",
			"document/sqlite-to-zip",
		],
	},
};
