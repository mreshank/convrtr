import type { Tool } from "../../types";

export const sdwToMarkdown: Tool = {
	id: "document/sdw-to-markdown",
	slug: "sdw-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-starwriter",
			"application/vnd.stardivision.writer",
			"application/x-sdw",
			"application/octet-stream",
		],
		ext: ["sdw"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:sdw-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard GitHub Flavored Markdown",
				explanation:
					"Extracts headings, paragraphs, bulleted lists, and OLE summary metadata into clean GFM Markdown with YAML frontmatter.",
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
			"SDW to Markdown — Convert StarWriter & StarOffice (.sdw) to Markdown Online | convrtr",
		h1: "Convert StarWriter (.sdw) to Markdown",
		intent:
			"Extract text, document structure, and metadata from vintage StarOffice and StarWriter files (.sdw) into clean GitHub Flavored Markdown directly in your browser. 100% offline client-side extraction with zero server uploads.",
		faq: [
			{
				q: "What is a StarWriter (.sdw) file?",
				a: "SDW is the native word processing format of StarWriter and StarOffice 3.x–5.x, developed by Star Division and later acquired by Sun Microsystems. It wraps document content inside an OLE 2.0 Compound File Binary (CFB) structure.",
			},
			{
				q: "Can modern office suites open .sdw files?",
				a: "Most modern versions of LibreOffice, Microsoft Word, and Google Docs have deprecated or dropped support for StarOffice 5.x .sdw files. convrtr extracts the pure text content, headings, and metadata without needing legacy software.",
			},
			{
				q: "Are my confidential office documents uploaded anywhere?",
				a: "Never. All OLE sector parsing, stream decompression, and Markdown generation happen 100% locally in your web browser using WebAssembly and TypeScript.",
			},
		],
		related: [
			"document/sxw-to-markdown",
			"document/abw-to-markdown",
			"document/cwk-to-markdown",
			"document/hwp-to-markdown",
			"document/rtf-to-markdown",
		],
	},
};
