import type { Tool } from "../../types";

export const whatsappToMarkdown: Tool = {
	id: "document/whatsapp-to-markdown",
	slug: "whatsapp-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/zip", "application/octet-stream"],
		ext: ["txt", "zip"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:whatsapp-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Archival Markdown",
				explanation:
					"Parses every timestamped message (both iOS and Android export formats, all common locales) into dated Markdown sections with participants, system notices and a media-file manifest. Message text is preserved verbatim.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "WhatsApp to Markdown — Archive Chats as Notes | convrtr",
		h1: "Convert WhatsApp Chat Export to Markdown",
		intent:
			"Turn a WhatsApp chat export (.txt, or .zip with media) into clean dated Markdown for Obsidian, Logseq, legal archives or long-term backup. Reads both iPhone and Android formats, groups by date, lists attached media — entirely in your browser, your conversations never uploaded.",
		faq: [
			{
				q: "How do I get the export file from WhatsApp?",
				a: "Open the chat, tap the contact or group name, choose Export Chat, then Without Media (.txt) or With Media (.zip). Drop that file here — iPhone and Android exports are both accepted.",
			},
			{
				q: "Why Markdown instead of PDF?",
				a: "PDFs freeze a chat into pages; Markdown keeps it as structured text you can search, quote, version-control and import into note apps like Obsidian or Logseq. Print or export to PDF later from any Markdown app if you need pages.",
			},
			{
				q: "Are photos and voice notes included?",
				a: "The .zip's media filenames are listed in an Attached media files manifest so nothing goes missing; match them against your unzipped export folder. Text and timestamps are fully converted.",
			},
			{
				q: "My iPhone chat seems cut off — is something missing?",
				a: "Probably not this tool's fault: iPhone Export Chat silently truncates around ~40,000 messages, and With Media exports can fail on size first. For very long chats, export Without Media.",
			},
			{
				q: "Are my private conversations uploaded anywhere?",
				a: "No. Parsing and rendering happen entirely inside your browser — unlike most chat-to-PDF sites, your messages never touch a server.",
			},
		],
		related: [
			"document/mhtml-to-html",
			"document/webarchive-to-html",
			"document/vcf-to-csv",
		],
	},
};
