import type { Tool } from "../../types";

export const abwToMarkdown: Tool = {
	id: "document/abw-to-markdown",
	slug: "abw-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-abiword",
			"application/abiword",
			"text/xml",
			"application/xml",
			"application/octet-stream",
		],
		ext: ["abw", "zabw"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:abw-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard Markdown",
				explanation:
					"Extracts AbiWord document metadata, headings, tables, styled character spans, blockquotes, and embedded illustrations into GitHub Flavored Markdown.",
				params: {
					includeMetadata: true,
					preserveImages: true,
				},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeMetadata",
				label: "Include Frontmatter",
				group: "Metadata",
				default: true,
			},
			{
				control: "toggle",
				key: "preserveImages",
				label: "Preserve Embedded Images",
				group: "Media",
				default: true,
			},
		],
	},
	seo: {
		title:
			"ABW to Markdown — Convert AbiWord (.abw, .zabw) to Markdown Online | convrtr",
		h1: "Convert AbiWord (.abw) to Markdown",
		intent:
			"Convert AbiWord (.abw, .zabw) XML word processor documents into clean, structured GitHub Flavored Markdown directly in your browser. 100% private client-side parsing with zero server uploads.",
		faq: [
			{
				q: "What is an AbiWord (.abw / .zabw) file?",
				a: "AbiWord (.abw) is the native XML document format of the cross-platform AbiWord word processor (part of GNOME Office). When compressed with gzip to save storage, it uses the .zabw extension. It encodes rich word processing elements including Dublin Core metadata, tables, nested styles, lists, and embedded base64 illustrations.",
			},
			{
				q: "Why convert AbiWord files to Markdown?",
				a: "Modern operating systems and cloud document tools cannot view AbiWord documents without installing specialized legacy software. Converting to GitHub Flavored Markdown produces universal plain text compatible with Obsidian, Notion, GitHub, and any standard markdown reader.",
			},
			{
				q: "Does this converter support compressed .zabw files?",
				a: "Yes. The converter automatically inspects gzip magic bytes at the beginning of the file and transparently decompresses .zabw archives in browser memory before extracting document structure.",
			},
			{
				q: "Are my documents uploaded to any server?",
				a: "Never. All XML parsing, gzip decompression, and markdown formatting occur 100% locally inside your browser using client-side TypeScript. Your confidential documents never leave your device.",
			},
		],
		related: [
			"document/rtf-to-markdown",
			"document/epub-to-markdown",
			"document/fb2-to-markdown",
			"document/pdb-to-markdown",
			"document/latex-to-markdown",
		],
	},
};
