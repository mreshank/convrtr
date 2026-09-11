import type { Tool } from "../../types";

export const rtfToMarkdown: Tool = {
	id: "document/rtf-to-markdown",
	slug: "rtf-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/rtf", "text/rtf", "text/richtext", "application/x-rtf"],
		ext: ["rtf"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:rtf-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard Structured Markdown (.md)",
				explanation:
					"Parses RTF control groups, decodes Unicode codepoint escapes, and transforms bold, italic, headings, and lists into clean semantic Markdown.",
				params: {},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Frontmatter (Title, Author, Generator)",
				group: "Formatting",
				default: true,
			},
		],
	},
	seo: {
		title:
			"RTF to Markdown — Convert Rich Text Format (.rtf) to Markdown | convrtr",
		h1: "Convert Rich Text Format (.rtf) to Markdown",
		intent:
			"Convert Microsoft Rich Text Format (.rtf) documents and legacy WordPad files into clean, readable GitHub Flavored Markdown for Obsidian, Notion, and Logseq. 100% private in-browser converter.",
		faq: [
			{
				q: "What is an RTF file?",
				a: "RTF (Rich Text Format) is a cross-platform document format developed by Microsoft for exchanging formatted text across word processors like WordPad, Microsoft Word, TextEdit on macOS, and LibreOffice.",
			},
			{
				q: "Why convert RTF to Markdown?",
				a: "With Microsoft officially removing WordPad from Windows 11, millions of legacy RTF files are being migrated into modern note-taking apps like Obsidian, Notion, Logseq, and Bear that natively use Markdown.",
			},
			{
				q: "Does this preserve bold, italics, and lists?",
				a: "Yes. convrtr parses RTF formatting control words (such as bold, italic, strikethrough, bullet points, and headings) and maps them cleanly to standard Markdown syntax.",
			},
			{
				q: "Are my documents uploaded to a remote server?",
				a: "No. All RTF tokenization and text conversion happen entirely client-side in your browser using pure TypeScript. No data ever leaves your computer.",
			},
		],
		related: [
			"document/epub-to-markdown",
			"document/xmind-to-markdown",
			"document/vnt-to-txt",
		],
	},
};
