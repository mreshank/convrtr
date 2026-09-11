import type { Tool } from "../../types";

export const orgToMarkdown: Tool = {
	id: "document/org-to-markdown",
	slug: "org-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/org", "text/x-org", "application/x-org", "text/plain"],
		ext: ["org"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:org-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard Markdown with Frontmatter",
				explanation:
					"Converts Org headings, tables, code blocks, and task checkboxes to GitHub Flavored Markdown with extracted YAML frontmatter.",
				params: { frontmatter: true },
			},
			{
				id: "reading-list",
				label: "Clean Markdown (No Frontmatter)",
				explanation:
					"Converts the document body to clean Markdown without prepending YAML metadata headers.",
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
			"Org to Markdown — Convert Emacs Org Mode (.org) to Markdown | convrtr",
		h1: "Convert Emacs Org Mode (.org) to Markdown",
		intent:
			"Convert Emacs Org Mode notes, agendas, tables, and task lists (.org) into clean GitHub Flavored Markdown directly in your browser. 100% private in-browser converter.",
		faq: [
			{
				q: "What is an Emacs Org Mode (.org) file?",
				a: "Org Mode is a major mode for GNU Emacs created in 2003 by Carsten Dominik. It is a plain-text system for keeping notes, maintaining TODO lists, planning projects, authoring documents, and managing personal knowledge graphs.",
			},
			{
				q: "How does convrtr convert Org mode elements into Markdown?",
				a: "convrtr parses Org-style headings (*, **) into Markdown headers (#, ##), transforms TODO/DONE states and [ ] checkboxes into GitHub Flavored Markdown task lists (- [ ]), converts |---+---| table rules to Markdown tables, wraps #+BEGIN_SRC blocks in fenced code blocks (```), translates inline formatting, and extracts #+TITLE / #+AUTHOR / #+DATE into YAML frontmatter.",
			},
			{
				q: "Can I use this to import Org notes into Obsidian or Notion?",
				a: "Yes! Obsidian, Notion, GitHub READMEs, and static site generators (Hugo, Astro, Next.js) natively read GitHub Flavored Markdown. Converted .org files can be dropped directly into your Obsidian vault or imported into Notion.",
			},
			{
				q: "Are my notes or documents uploaded to a remote server?",
				a: "Never. All text parsing, AST transformation, and Markdown synthesis run 100% locally inside your browser memory using pure TypeScript. Your private notes, research, and journals never leave your computer.",
			},
		],
		related: [
			"document/bibtex-to-markdown",
			"document/latex-to-markdown",
			"document/epub-to-markdown",
			"document/rtf-to-markdown",
		],
	},
};
