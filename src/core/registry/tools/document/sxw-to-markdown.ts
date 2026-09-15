import type { Tool } from "../../types";

export const sxwToMarkdown: Tool = {
	id: "document/sxw-to-markdown",
	slug: "sxw-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.sun.xml.writer",
			"application/x-staroffice-writer",
			"application/sxw",
			"application/octet-stream",
		],
		ext: ["sxw"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:sxw-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard Markdown",
				explanation:
					"Extracts OpenOffice.org 1.x document text, headings, bullet/numbered lists, and tables into clean GitHub Flavored Markdown with Dublin Core metadata frontmatter.",
				params: {
					includeFrontmatter: true,
				},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include YAML Frontmatter",
				group: "Metadata",
				default: true,
			},
		],
	},
	seo: {
		title:
			"SXW to Markdown — Convert OpenOffice (.sxw) to Markdown Online | convrtr",
		h1: "Convert OpenOffice.org 1.x (.sxw) to Markdown",
		intent:
			"Convert legacy OpenOffice.org 1.x and StarOffice Writer documents (.sxw) into clean, modern GitHub Flavored Markdown directly in your browser. 100% private client-side extraction with zero server uploads.",
		faq: [
			{
				q: "What is an OpenOffice .sxw file?",
				a: "SXW was the default word processing document format for OpenOffice.org 1.0 and 1.1 (and StarOffice 6.0) before the standardization of OpenDocument Format (ODF / .odt) in 2005. It is a ZIP archive containing XML document streams including content.xml and meta.xml.",
			},
			{
				q: "Why convert SXW documents to Markdown?",
				a: "Modern word processors and mobile devices cannot view legacy SXW files without installing deprecated software suites. Converting to Markdown produces portable, future-proof plain text compatible with Obsidian, Notion, GitHub, and any text editor.",
			},
			{
				q: "How does the in-browser SXW extractor work?",
				a: "convrtr unzips the SXW archive in memory using client-side JavaScript, parses the XML hierarchy of paragraphs, headings, lists, and tables, and converts the content into structured GitHub Flavored Markdown with preserved Dublin Core metadata.",
			},
			{
				q: "Are my documents uploaded to an external server?",
				a: "Never. All ZIP decompression, XML parsing, and Markdown generation run 100% locally in your web browser memory. No data ever leaves your computer.",
			},
		],
		related: [
			"document/abw-to-markdown",
			"document/cwk-to-markdown",
			"document/hwp-to-markdown",
			"document/rtf-to-markdown",
			"document/enex-to-markdown",
		],
	},
};
