import type { Tool } from "../../types";

export const ldifToCsv: Tool = {
	id: "document/ldif-to-csv",
	slug: "ldif-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/octet-stream"],
		ext: ["ldif"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:ldif-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Directory Table",
				explanation:
					"Unfolds RFC 2849 lines, decodes base64 values and flattens every entry to dn plus the union of attributes. Multi-valued attributes join with pipes.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "LDIF to CSV — LDAP Directory Export to Spreadsheet | convrtr",
		h1: "Convert LDIF Directory Export to CSV",
		intent:
			"Turn LDAP LDIF exports into a CSV directory table for audits, migrations and reporting — folded lines unfolded, base64 photos decoded or flagged, every attribute a column. Entirely in your browser, directory data never uploaded.",
		faq: [
			{
				q: "What do I get for each entry?",
				a: "One row: the dn plus every attribute found across the export (cn, mail, memberOf, custom schema included). Multi-valued attributes join with | so nothing is dropped.",
			},
			{
				q: "What happens to photos and certificates?",
				a: "Base64 values decode to UTF-8 where possible; true binary (JPEG photos, certificates) becomes an honest [binary data] marker instead of mojibake.",
			},
			{
				q: "Does it handle changetype/modify LDIFs?",
				a: "It reads the entries and skips replication directives — this is an export reader for audits and migrations, not a directory writer.",
			},
			{
				q: "Is my directory data uploaded anywhere?",
				a: "No. Parsing and CSV writing run entirely inside your browser — directory dumps stay inside the perimeter.",
			},
		],
		related: [
			"document/vcf-to-csv",
			"document/gedcom-to-csv",
			"document/ofx-to-csv",
		],
	},
};
