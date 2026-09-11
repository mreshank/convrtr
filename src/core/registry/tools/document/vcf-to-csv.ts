import type { Tool } from "../../types";

export const vcfToCsv: Tool = {
	id: "document/vcf-to-csv",
	slug: "vcf-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/vcard",
			"text/x-vcard",
			"text/directory",
			"application/vcard",
			"application/x-vcard",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["vcf", "vcard"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:vcf-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Universal Excel / Sheets CSV",
				explanation:
					"Parses all contacts from single or multi-card VCF address books and formats them into an RFC 4180 CSV table with UTF-8 BOM encoding for seamless opening in Microsoft Excel, Google Sheets, Apple Numbers, and CRM systems.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VCF to CSV — Convert vCard Contacts to Excel Spreadsheet Online | convrtr",
		h1: "Convert VCF Contacts to CSV Spreadsheet",
		intent:
			"Convert Apple iPhone, iCloud, Android, and Outlook vCard (.vcf) address books into clean CSV spreadsheets for Microsoft Excel and Google Sheets directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "Does this support multi-contact VCF files containing hundreds or thousands of contacts?",
				a: "Yes. The converter loops through all BEGIN:VCARD and END:VCARD records within the file and generates an individual spreadsheet row for every single contact.",
			},
			{
				q: "Will international characters and accents open properly in Microsoft Excel?",
				a: "Yes. The exported CSV file includes a UTF-8 Byte Order Mark (BOM). This signals to Microsoft Excel on Windows and Mac to read the file immediately as UTF-8, ensuring Arabic, Chinese, Japanese, Hebrew, Cyrillic, and accented Latin names display with zero formatting errors.",
			},
			{
				q: "Are my personal contacts, phone numbers, and emails safe and private?",
				a: "Absolutely. Address books contain sensitive personal and professional information. convrtr processes your VCF file entirely client-side within your browser's local memory. Not a single byte or phone number is ever transmitted to a server.",
			},
			{
				q: "Which fields are extracted into the CSV table?",
				a: "The converter extracts First Name, Last Name, Full Name, Nickname, Company/Organization, Job Title, Department, Mobile Phone, Work Phone, Home Phone, Other Phone, Primary & Secondary Emails, Street Address, City, State/Province, Postal Code, Country, Birthday, Notes, and Website URL.",
			},
		],
		related: ["document/mhtml-to-html", "document/msg-to-eml"],
	},
};
