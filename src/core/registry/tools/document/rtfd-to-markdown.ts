import type { Tool } from "../../types";

export const rtfdToMarkdown: Tool = {
	id: "document/rtfd-to-markdown",
	slug: "rtfd-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-rtfd",
			"application/rtfd",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["rtfd"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:rtfd-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard GitHub Flavored Markdown",
				explanation:
					"Extracts styled text, headings, font styling, and links embedded graphic attachments from Apple RTFD bundles into GFM Markdown.",
				params: { includeFrontmatter: true },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Metadata Frontmatter",
				group: "Document",
				default: true,
			},
		],
	},
	seo: {
		title:
			"RTFD to Markdown — Convert Apple RTFD with Attachments to Markdown Online | convrtr",
		h1: "Convert Apple RTFD to Markdown",
		intent:
			"Unpack and convert Apple Rich Text Format Directory bundles (.rtfd) into clean GitHub Flavored Markdown directly in your browser. Extracts styled text and graphic attachments 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is an Apple RTFD (.rtfd) file?",
				a: "RTFD (Rich Text Format Directory) is Apple's compound document bundle format used across macOS TextEdit, Apple Mail, and Pages. Unlike standard single-file RTF, an RTFD bundle encapsulates the document text (TXT.rtf) alongside embedded graphic attachments such as PNG, JPEG, TIFF, and PDF illustrations.",
			},
			{
				q: "How does convrtr convert RTFD bundles?",
				a: "convrtr unzips the RTFD package in browser memory, parses the underlying rich text stream, maps headings and typography (bold, italic, strikethrough, monospace) to Markdown syntax, and catalogs and links all embedded attachments.",
			},
			{
				q: "Are my confidential Apple documents uploaded to external servers?",
				a: "Never. All archive decompression, RTF parsing, and Markdown generation occur strictly within your local browser sandbox. No file data is ever transmitted across the network.",
			},
		],
		related: [
			"document/rtf-to-markdown",
			"document/cwk-to-markdown",
			"document/abw-to-markdown",
			"document/zabw-to-markdown",
			"document/sxw-to-markdown",
		],
	},
};
