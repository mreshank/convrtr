import type { Tool } from "../../types";

export const icsToCsv: Tool = {
	id: "document/ics-to-csv",
	slug: "ics-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/calendar", "text/plain", "application/octet-stream"],
		ext: ["ics", "ical", "ifb"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:ics-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Event Table",
				explanation:
					"Unfolds RFC 5545 lines and flattens every event to uid/start/end/summary/location/description/recurrence with proper quoting and an Excel-friendly BOM.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "ICS to CSV — Calendar Export to Spreadsheet | convrtr",
		h1: "Convert ICS Calendar to CSV",
		intent:
			"Turn an iCalendar (.ics) export from Google, Apple or Outlook calendars into a CSV event table for analysis, migration and archiving — folded lines unfolded, recurrence kept, dates verbatim so no timezone is ever mis-inferred. Entirely in your browser.",
		faq: [
			{
				q: "What do I get for each event?",
				a: "One row: uid, start, end, summary, location, description and recurrence rule — everything a spreadsheet or migration script needs, nothing a calendar app would hide.",
			},
			{
				q: "Are timezones converted?",
				a: "Deliberately not: dates pass through verbatim (UTC Z, floating or TZID-qualified) so nothing is ever mis-inferred. Normalise in the spreadsheet if you need one zone.",
			},
			{
				q: "Do recurring events expand?",
				a: "No — the RRULE rides along untouched for calendar apps to interpret. Expansion is a calendar computation, not a data conversion.",
			},
			{
				q: "Is my calendar uploaded anywhere?",
				a: "No. Parsing and CSV writing run entirely inside your browser.",
			},
		],
		related: [
			"document/vcf-to-csv",
			"document/ofx-to-csv",
			"document/gedcom-to-csv",
		],
	},
};
