import type { Tool } from "../../types";

export const mboxToZip: Tool = {
	id: "document/mbox-to-zip",
	slug: "mbox-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/mbox", "text/plain", "application/octet-stream"],
		ext: ["mbox", "mbx"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:mbox-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Message Archive",
				explanation:
					"Splits the mailbox on mboxrd From-lines and packs each message bit-exact (headers, MIME bodies, attachments untouched) into a ZIP of individually importable .eml files.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "MBOX to EML — Split Mailbox Without Thunderbird | convrtr",
		h1: "Convert MBOX Mailbox to Individual EML Files",
		intent:
			"Split a Thunderbird, Apple Mail, Gmail Takeout or Google Vault .mbox archive into individual .eml messages without installing Thunderbird or uploading your mail to a conversion site. Messages come out bit-exact, named by subject, packed in a ZIP — entirely in your browser.",
		faq: [
			{
				q: "Why split an mbox instead of importing it somewhere?",
				a: "Single-message .eml files are independently searchable, shareable, and ingestible by eDiscovery, phishing-analysis and archival pipelines (paperless-ngx and friends). Splitting also rescues one mailbox from a client you no longer run.",
			},
			{
				q: "Are attachments and formatting preserved?",
				a: "Yes — splitting cuts between messages and unescapes >From lines only. Every message's headers, HTML bodies, MIME parts and attachments are byte-identical to the source mailbox.",
			},
			{
				q: "Which mbox files are accepted?",
				a: "Standard mboxrd files from Thunderbird, Apple Mail, Gmail Takeout, Google Vault, Proton Mail export and MailStore. Files without From-separator lines are rejected with a clear error rather than guessed at.",
			},
			{
				q: "Is my email uploaded anywhere?",
				a: "No. Splitting and zipping run entirely inside your browser — your correspondence never touches a server.",
			},
		],
		related: [
			"document/msg-to-eml",
			"document/vcf-to-csv",
			"document/mhtml-to-html",
		],
	},
};
