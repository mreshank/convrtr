import type { Tool } from "../../types";

export const epubToMarkdown: Tool = {
	id: "document/epub-to-markdown",
	slug: "epub-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/epub+zip",
			"application/x-epub",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["epub"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:epub-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard Structured Markdown (.md)",
				explanation:
					"Unpacks the EPUB archive, follows the spine reading sequence, and converts all book chapters into clean semantic Markdown with YAML frontmatter.",
				params: {},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Frontmatter (Title, Author, Metadata)",
				group: "Formatting",
				default: true,
			},
			{
				control: "toggle",
				key: "includeDividers",
				label: "Include Chapter Horizontal Dividers (Horizontal Rules)",
				group: "Formatting",
				default: true,
			},
		],
	},
	seo: {
		title:
			"EPUB to Markdown — Convert EPUB E-Books to Clean Markdown | convrtr",
		h1: "Convert EPUB E-Books to Markdown",
		intent:
			"Convert EPUB e-books and digital publications into clean, readable Markdown documents for Obsidian, Notion, Logseq, and text analysis directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an EPUB file?",
				a: "EPUB (Electronic Publication) is the open XML/HTML-based e-book standard maintained by the W3C. EPUB files package chapters, stylesheets, images, and package metadata (OPF) inside a ZIP archive container.",
			},
			{
				q: "Why convert EPUB to Markdown?",
				a: "Markdown is a lightweight, human-readable plain text format ideal for personal knowledge management tools like Obsidian, Notion, Logseq, Bear, and static site generators. Converting EPUB to Markdown allows you to highlight, search, take notes, and analyze books seamlessly.",
			},
			{
				q: "How does convrtr preserve chapter order?",
				a: "convrtr parses the OPF spine manifest (<spine><itemref .../></spine>) to follow the author's exact canonical reading order, translating headings, lists, blockquotes, code blocks, and emphasis into standard Markdown without missing sections.",
			},
			{
				q: "Are my books uploaded to any cloud server?",
				a: "Never. All ZIP extraction, XML parsing, and Markdown generation happen strictly inside your browser memory. Your e-books never leave your device.",
			},
		],
		related: [
			"document/xmind-to-markdown",
			"document/vnt-to-txt",
			"document/cbz-to-pdf",
			"document/goodnotes-to-pdf",
		],
	},
};
