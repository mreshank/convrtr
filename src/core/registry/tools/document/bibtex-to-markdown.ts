import type { Tool } from "../../types";

export const bibtexToMarkdown: Tool = {
	id: "document/bibtex-to-markdown",
	slug: "bibtex-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-bibtex",
			"text/x-bibtex",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["bib", "bibtex"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:bibtex-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Markdown Bibliography Table",
				explanation:
					"Converts BibTeX academic citation databases into a clean GitHub Flavored Markdown table with titles, authors, venues, and DOI links.",
				params: { format: "table" },
			},
			{
				id: "visually-lossless",
				label: "Annotated Reading List",
				explanation:
					"Formats bibliography entries into a numbered reading list with full abstracts and citation keys ready for Obsidian, Notion, or Zettelkasten notes.",
				params: { format: "list", includeAbstract: true },
			},
		],
		advanced: [
			{
				control: "select",
				key: "format",
				label: "Output Format",
				group: "Layout",
				default: "table",
				options: [
					{ value: "table", label: "Markdown Table" },
					{ value: "list", label: "Numbered Reading List" },
					{ value: "json", label: "Structured Citation JSON" },
				],
			},
			{
				control: "toggle",
				key: "includeAbstract",
				label: "Include Abstracts in List Output",
				group: "Content",
				default: false,
			},
		],
	},
	seo: {
		title:
			"BibTeX to Markdown — Convert .bib References to Markdown Table | convrtr",
		h1: "Convert BibTeX (.bib) to Markdown",
		intent:
			"Convert academic BibTeX citation files (.bib, .bibtex) into clean Markdown tables, annotated reading lists, and JSON references directly in your browser. 100% private in-browser converter.",
		faq: [
			{
				q: "What is a BibTeX (.bib) file?",
				a: "BibTeX is the universal reference management format created for LaTeX documents. Exported by Google Scholar, Zotero, Mendeley, and arXiv, .bib files contain bibliographic metadata for journal articles, conference papers, books, and theses.",
			},
			{
				q: "How does convrtr handle LaTeX special characters and accents?",
				a: "convrtr includes an extensive LaTeX character decoder that translates accents (e.g. {\\\"u} to ü, {\\'e} to é, \\c{c} to ç), typographic dashes, and symbols into clean Unicode text.",
			},
			{
				q: "Can I paste the Markdown output into Obsidian or Notion?",
				a: "Yes! The output is standard GitHub Flavored Markdown (GFM). Both the Table layout and the Reading List layout paste seamlessly into Obsidian, Notion, Logseq, and static site generators.",
			},
			{
				q: "Are my research bibliographies uploaded to a server?",
				a: "Never. All BibTeX tokenization, LaTeX accent replacement, and Markdown generation run 100% locally in your browser memory using pure TypeScript. No data ever leaves your device.",
			},
		],
		related: [
			"document/latex-to-markdown",
			"document/rtf-to-markdown",
			"document/epub-to-markdown",
		],
	},
};
