import type { Tool } from "../../types";

export const enexToMarkdown: Tool = {
	id: "document/enex-to-markdown",
	slug: "enex-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/xml",
			"application/x-evernote-enex",
			"application/enex+xml",
			"text/xml",
			"application/octet-stream",
		],
		ext: ["enex"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:enex-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard Markdown with Frontmatter",
				explanation:
					"Converts Evernote notes, checklists, tables, and tags into clean GitHub Flavored Markdown with preserved YAML frontmatter headers.",
				params: { frontmatter: true },
			},
			{
				id: "clean",
				label: "Clean Markdown (No Frontmatter)",
				explanation:
					"Converts note bodies to clean Markdown without prepending YAML metadata frontmatter headers.",
				params: { frontmatter: false },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "frontmatter",
				label: "Include YAML Frontmatter",
				group: "Metadata",
				default: true,
			},
		],
	},
	seo: {
		title:
			"Evernote ENEX to Markdown — Convert Evernote (.enex) Notes to Markdown | convrtr",
		h1: "Convert Evernote (.enex) to Markdown",
		intent:
			"Convert Evernote XML Export (.enex) notebook archives into clean GitHub Flavored Markdown files with preserved YAML frontmatter, tags, checklists, and tables directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an Evernote ENEX (.enex) file?",
				a: "ENEX (Evernote XML Export) is an XML-based archive format exported by Evernote containing one or more rich-text notes, tags, author metadata, creation and modification timestamps, and ENML (Evernote Markup Language) formatted bodies.",
			},
			{
				q: "Why convert Evernote ENEX files to Markdown?",
				a: "Many users are migrating away from Evernote to open-format personal knowledge management (PKM) tools like Obsidian, Logseq, Notion, and Bear. Markdown files with YAML frontmatter can be copied directly into Obsidian vaults or imported into modern markdown editors without proprietary lock-in.",
			},
			{
				q: "How does convrtr handle Evernote checklists and tables?",
				a: "convrtr translates <en-todo checked='true'/> into GFM task items (- [x]), unchecked todos into (- [ ]), converts HTML tables into clean GFM pipe tables, wraps preformatted code into fenced code blocks, and preserves bold, italic, links, and tags.",
			},
			{
				q: "Are my personal notes and journals uploaded to a server?",
				a: "Never. All XML parsing, ENML translation, and Markdown formatting execute 100% client-side inside your browser using pure TypeScript. Your personal journals, passwords, and private records never touch any remote server.",
			},
		],
		related: [
			"document/org-to-markdown",
			"document/xmind-to-markdown",
			"document/epub-to-markdown",
			"document/bibtex-to-markdown",
		],
	},
};
