import type { Tool } from "../../types";

export const nbToMarkdown: Tool = {
	id: "document/nb-to-markdown",
	slug: "nb-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/mathematica",
			"application/vnd.wolfram.mathematica",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["nb", "cdf"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:nb-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard GitHub Flavored Markdown",
				explanation:
					"Converts Wolfram Mathematica Notebook hierarchical expression trees, sections, inputs, outputs, formulas, and tables into clean GitHub Flavored Markdown.",
				params: {
					includeFrontmatter: true,
					renderOutputs: true,
					codeLanguage: "mathematica",
				},
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
			{
				control: "toggle",
				key: "renderOutputs",
				label: "Include Cell Outputs",
				group: "Cells",
				default: true,
			},
		],
	},
	seo: {
		title:
			"Mathematica NB to Markdown — Convert Wolfram Notebook (.nb) to Markdown Online | convrtr",
		h1: "Convert Wolfram Mathematica Notebook (.nb) to Markdown",
		intent:
			"Convert Wolfram Mathematica Notebook files (.nb, .cdf) into clean, beautifully structured GitHub Flavored Markdown directly in your browser. Translates code cells, outputs, formulas, and math symbols 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Wolfram Mathematica Notebook (.nb) file?",
				a: "A Mathematica Notebook (.nb) is the native computational notebook format created by Wolfram Research for Mathematica and Wolfram One. It stores interactive computational experiments, symbolic algebra derivations, formatted documentation, and program code in structured hierarchical Cell expression trees.",
			},
			{
				q: "How does convrtr translate Mathematica formulas and cells?",
				a: "convrtr analyzes the Wolfram box language (BoxData, RowBox, SuperscriptBox, FractionBox, SqrtBox), converts Wolfram special characters (such as Greek letters and mathematical operators) into clean Unicode symbols, formats sections and headings into Markdown headers, and wraps computations into highlighted code blocks.",
			},
			{
				q: "Are my scientific notebooks and proprietary algorithms kept private?",
				a: "Completely private. All parsing, symbol translation, and Markdown rendering take place locally inside your browser sandbox. No notebook data is ever sent to external cloud servers.",
			},
		],
		related: [
			"document/org-to-markdown",
			"document/latex-to-markdown",
			"document/abw-to-markdown",
			"document/rtfd-to-markdown",
		],
	},
};
