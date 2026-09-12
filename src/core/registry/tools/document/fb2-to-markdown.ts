import type { Tool } from "../../types";

export const fb2ToMarkdown: Tool = {
	id: "document/fb2-to-markdown",
	slug: "fb2-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-fictionbook+xml",
			"application/x-fictionbook",
			"application/xml",
			"text/xml",
			"application/octet-stream",
		],
		ext: ["fb2"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:fb2-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard Markdown with Frontmatter",
				explanation:
					"Converts FictionBook 2.0 e-books into clean GitHub Flavored Markdown with book metadata, chapters, poems, epigraphs, and embedded images.",
				params: { includeFrontmatter: true, extractImages: true },
			},
			{
				id: "clean",
				label: "Clean Text (No Frontmatter)",
				explanation:
					"Converts chapters and prose to clean Markdown without prepending YAML metadata frontmatter headers.",
				params: { includeFrontmatter: false, extractImages: true },
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
			{
				control: "toggle",
				key: "extractImages",
				label: "Extract Embedded Images",
				group: "Media",
				default: true,
			},
		],
	},
	seo: {
		title:
			"FictionBook FB2 to Markdown — Convert FB2 E-Books to Markdown | convrtr",
		h1: "Convert FictionBook (.fb2) to Markdown",
		intent:
			"Convert FictionBook 2.0 (.fb2) e-book XML documents into clean GitHub Flavored Markdown with preserved YAML frontmatter, chapters, epigraphs, poems, and embedded illustrations directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a FictionBook (.fb2) file?",
				a: "FictionBook 2.0 (FB2) is an open XML-based e-book format created by Dmitry Gribov and Michael Matsnev. It encodes structured literature containing bibliographic metadata, hierarchical sections, epigraphs, poems, citations, and base64-encoded binary images directly inside a single document.",
			},
			{
				q: "Why convert FB2 e-books to Markdown?",
				a: "Modern personal knowledge management (PKM) systems like Obsidian, Logseq, and Notion, as well as e-readers and note-taking apps, rely on standard Markdown. Converting FB2 e-books into Markdown allows readers to annotate literature, cross-reference quotes, and build private digital libraries without proprietary e-reader software.",
			},
			{
				q: "How does convrtr handle poems, epigraphs, and book covers?",
				a: "convrtr preserves book structure by mapping <section> and <title> tags to proportional Markdown headings (# and ##), formatting <epigraph> and <cite> as blockquotes (>), converting <poem> stanzas into formatted verse, and decoding embedded base64 <binary> cover and inline illustrations into clean Markdown images.",
			},
			{
				q: "Are my e-books uploaded to any server?",
				a: "Never. All XML decoding, text normalization, and Markdown generation happen 100% in your browser's local memory using pure TypeScript. Your books and reading materials are never transmitted to any third party.",
			},
		],
		related: [
			"document/epub-to-markdown",
			"document/enex-to-markdown",
			"document/org-to-markdown",
			"document/rtf-to-markdown",
		],
	},
};
