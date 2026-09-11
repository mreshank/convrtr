import type { Tool } from "../../types";

export const latexToMarkdown: Tool = {
	id: "document/latex-to-markdown",
	slug: "latex-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-latex",
			"text/x-latex",
			"text/x-tex",
			"application/x-tex",
			"text/plain",
		],
		ext: ["tex", "latex", "ltx"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:latex-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard Academic Markdown (.md)",
				explanation:
					"Translates LaTeX scientific markup into clean GitHub Flavored Markdown while preserving LaTeX math blocks ($...$ and $$...$$), sections, lists, and metadata.",
				params: {},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Frontmatter (Title, Author, Date)",
				group: "Formatting",
				default: true,
			},
			{
				control: "toggle",
				key: "preserveMath",
				label: "Preserve Math Equations ($ and $$)",
				group: "Formatting",
				default: true,
			},
		],
	},
	seo: {
		title:
			"LaTeX to Markdown — Convert LaTeX (.tex) to Markdown Online | convrtr",
		h1: "Convert LaTeX (.tex) Papers to Markdown",
		intent:
			"Convert scientific LaTeX (.tex) manuscripts and arXiv source files into clean, readable GitHub Flavored Markdown with preserved math equations for Obsidian, Notion, GitHub, and Hugo. 100% private in-browser converter.",
		faq: [
			{
				q: "What is LaTeX (.tex)?",
				a: "LaTeX is a high-quality typesetting system widely used in mathematics, physics, computer science, and academia for publishing technical papers, journal articles, and theses with complex mathematical formulas.",
			},
			{
				q: "Why convert LaTeX to Markdown?",
				a: "Modern knowledge-base apps like Obsidian, Notion, Logseq, and static site generators (Hugo, Docusaurus, Astro) natively render Markdown with KaTeX/MathJax. Converting .tex to Markdown makes research notes searchable and interoperable without needing a full TeX Live distribution.",
			},
			{
				q: "Are mathematical equations preserved?",
				a: "Yes. Inline math ($...$) and display math environments (equation, align, gather, and $$...$$) are preserved intact so they render seamlessly with KaTeX and MathJax.",
			},
			{
				q: "Are my research papers or manuscripts uploaded anywhere?",
				a: "Never. All parsing and conversion are executed 100% client-side in your web browser memory using pure TypeScript. No data or draft ever leaves your device.",
			},
		],
		related: [
			"document/rtf-to-markdown",
			"document/epub-to-markdown",
			"document/xmind-to-markdown",
			"document/vnt-to-txt",
		],
	},
};
