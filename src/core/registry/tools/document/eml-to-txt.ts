import type { Tool } from "../../types";

export const emlToTxt: Tool = {
	id: "document/eml-to-txt",
	slug: "eml-to-txt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["message/rfc822", "text/plain", "application/octet-stream"],
		ext: ["eml"],
	},
	output: { ext: "txt", mime: "text/plain" },
	engines: ["extract:eml-to-txt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Readable Text",
				explanation:
					"Decodes MIME parts in their declared charsets (quoted-printable, base64), prefers text/plain with an HTML-stripped fallback, and manifests attachments. Headers trimmed to From/To/Date/Subject.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "EML to TXT — Email Archive to Plain Text | convrtr",
		h1: "Convert EML Email to Plain Text",
		intent:
			"Turn .eml email files — DOS-era archives, Thunderbird exports, mbox splits — into clean readable plain text for grep, archiving and long-term storage. MIME decoded properly, not concatenated with tags. Entirely in your browser.",
		faq: [
			{
				q: "I have decades of .eml files. Can't I just concatenate them?",
				a: "You can, but you keep every MIME header, base64 blob and HTML tag with it. This decodes each message to what a human would read — headers trimmed, bodies decoded, attachments listed — one clean text per email.",
			},
			{
				q: "What about HTML-only emails?",
				a: "They convert via tag-stripping with block structure preserved (paragraphs, breaks, lists) — readable text, not tag soup.",
			},
			{
				q: "Do attachments survive?",
				a: "As a manifest (filenames), not bytes — this is the reading direction. For the bytes themselves, keep the .eml or split mbox archives with mbox-to-zip.",
			},
			{
				q: "Is my mail archive uploaded anywhere?",
				a: "No. MIME parsing and decoding run entirely inside your browser.",
			},
		],
		related: [
			"document/mbox-to-zip",
			"document/msg-to-eml",
			"document/emlx-to-eml",
		],
	},
};
