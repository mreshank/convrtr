import type { Tool } from "../../types";

export const gedcomToCsv: Tool = {
	id: "document/gedcom-to-csv",
	slug: "gedcom-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/x-gedcom",
			"application/x-gedcom",
			"text/gedcom",
			"text/plain",
		],
		ext: ["ged", "gedcom"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:gedcom-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard RFC 4180 CSV with UTF-8 BOM",
				explanation:
					"Extracts individuals, birth/death vital statistics, and parent/spouse family relationships into a clean spreadsheet ready for Excel and Google Sheets.",
				params: {},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "resolveFamilyRelationships",
				label: "Resolve Family Relationships (Parents & Spouses)",
				group: "Data",
				default: true,
			},
			{
				control: "select",
				key: "delimiter",
				label: "CSV Column Delimiter",
				group: "Formatting",
				default: ",",
				options: [
					{ value: ",", label: "Comma (,)" },
					{ value: ";", label: "Semicolon (;) — European Excel" },
				],
			},
		],
	},
	seo: {
		title:
			"GEDCOM to CSV — Convert Family Tree (.ged) to Excel & CSV | convrtr",
		h1: "Convert GEDCOM (.ged) Family Trees to CSV",
		intent:
			"Convert GEDCOM (.ged) genealogy files exported from Ancestry, MyHeritage, or FamilySearch into structured Excel spreadsheets and CSV tables directly in your browser. 100% private in-browser converter.",
		faq: [
			{
				q: "What is a GEDCOM (.ged) file?",
				a: "GEDCOM (Genealogical Data Communication) is the universal open standard for exchanging genealogical information between family history software (such as Ancestry.com, FamilySearch, MyHeritage, Gramps, and RootsMagic).",
			},
			{
				q: "Why convert GEDCOM to CSV?",
				a: "Dedicated genealogy programs and websites often require expensive monthly subscriptions or specialized desktop software. Converting your family tree to CSV allows you to open, search, filter, and analyze ancestors in Microsoft Excel, Google Sheets, or Notion databases.",
			},
			{
				q: "Does this resolve parent and spouse relationships?",
				a: "Yes. convrtr cross-references GEDCOM individual records (INDI) with family records (FAM) to automatically populate father, mother, and spouse names alongside each ancestor's vital dates and birth/death locations.",
			},
			{
				q: "Is my personal family history uploaded anywhere?",
				a: "Never. All parsing and CSV spreadsheet generation happen 100% locally inside your web browser memory. No names, birth dates, or living relative details ever leave your device.",
			},
		],
		related: [
			"document/vcf-to-csv",
			"document/fit-to-csv",
			"document/rtf-to-markdown",
			"document/epub-to-markdown",
		],
	},
};
