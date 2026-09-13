import type { Tool } from "../../types";

export const hwpToMarkdown: Tool = {
	id: "document/hwp-to-markdown",
	slug: "hwp-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-hwp",
			"application/haansofthwp",
			"application/vnd.hancom.hwp",
			"application/octet-stream",
		],
		ext: ["hwp"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:hwp-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard Markdown",
				explanation:
					"Extracts Hangul Word Processor document sections, paragraphs, headings, and metadata into clean GitHub Flavored Markdown.",
				params: {
					includeFrontmatter: true,
				},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Frontmatter",
				group: "Metadata",
				default: true,
			},
		],
	},
	seo: {
		title:
			"HWP to Markdown — Convert Hangul Word Processor (.hwp) to Markdown Online | convrtr",
		h1: "Convert Hangul Word Processor (.hwp) to Markdown",
		intent:
			"Convert Hangul Word Processor (.hwp 5.x) documents into clean, structured GitHub Flavored Markdown directly in your browser. 100% private client-side parsing with zero server uploads.",
		faq: [
			{
				q: "What is an HWP file?",
				a: "HWP is the native file format of Hancom Hangul (Hangul Word Processor), the de facto standard word processing software in South Korea's public sector, academia, and enterprise. Modern HWP 5.x files are Microsoft OLE 2.0 Compound File Binary (CFB) containers storing Deflate-compressed BodyText sections encoded in UTF-16LE.",
			},
			{
				q: "Why convert HWP documents to Markdown?",
				a: "HWP files cannot be opened natively on macOS, Linux, or modern web browsers without installing proprietary Hancom viewers. Converting HWP files to GitHub Flavored Markdown transforms legacy Korean documents into clean, readable text ready for Obsidian, Notion, LLM ingestion, and cross-platform editing.",
			},
			{
				q: "Does this converter decompress compressed HWP sections?",
				a: "Yes. In accordance with the HWP 5.0 specification, compressed BodyText section streams are dynamically decompressed in browser memory using Deflate before records (such as HWPTAG_PARA_TEXT) are parsed.",
			},
			{
				q: "Are my sensitive documents uploaded to any remote server?",
				a: "Never. All OLE CFB directory traversing, stream decompression, record tokenization, and markdown rendering execute entirely within your browser's local sandbox via client-side TypeScript. Your proprietary documents and personal data never touch a server.",
			},
		],
		related: [
			"document/abw-to-markdown",
			"document/rtf-to-markdown",
			"document/epub-to-markdown",
			"document/fb2-to-markdown",
			"document/pdb-to-markdown",
		],
	},
};
