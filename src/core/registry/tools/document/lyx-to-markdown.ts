import type { Tool } from "../../types";

export const lyxToMarkdown: Tool = {
	id: "document/lyx-to-markdown",
	slug: "lyx-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-lyx",
			"text/x-lyx",
			"application/lyx",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["lyx"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:lyx-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard GitHub Flavored Markdown",
				explanation:
					"Converts LyX document processor layouts, LaTeX formulas, tabular insets, graphics, and lists into clean GitHub Flavored Markdown.",
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
			"LyX to Markdown — Convert LyX Document (.lyx) to Markdown Online | convrtr",
		h1: "Convert LyX Document (.lyx) to Markdown",
		intent:
			"Convert LyX scientific document processor files (.lyx) into clean, readable GitHub Flavored Markdown directly in your browser. Translates LaTeX layouts, formulas, matrices, and tables 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a LyX (.lyx) document file?",
				a: "LyX is an open-source WYSIWYM (What You See Is What You Mean) document processor based on LaTeX, created in 1995. It is widely used by researchers, physicists, and university faculty to write academic papers, theses, and mathematical books without writing raw TeX markup by hand.",
			},
			{
				q: "How does convrtr translate LyX documents?",
				a: "convrtr parses the hierarchical LyX document tree, converts layout blocks (Title, Section, Subsection, Abstract) into Markdown headings, maps LaTeX mathematical insets into standard MathJax ($...$ and $$...$$) formulas, converts Tabular insets into GFM tables, and preserves image links.",
			},
			{
				q: "Are my academic manuscripts and unpublished research confidential?",
				a: "Completely private. All document parsing, formula extraction, and Markdown rendering take place locally in your browser's JavaScript sandbox. No content is ever transmitted over the network.",
			},
		],
		related: [
			"document/latex-to-markdown",
			"document/nb-to-markdown",
			"document/org-to-markdown",
			"document/abw-to-markdown",
		],
	},
};
