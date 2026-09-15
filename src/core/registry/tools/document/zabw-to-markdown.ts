import type { Tool } from "../../types";

export const zabwToMarkdown: Tool = {
	id: "document/zabw-to-markdown",
	slug: "zabw-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-abiword",
			"application/x-gzip",
			"application/gzip",
			"application/octet-stream",
		],
		ext: ["zabw"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:zabw-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard GitHub Flavored Markdown",
				explanation:
					"Decompresses Gzip-packed AbiWord document XML and translates headings, styled text, lists, tables, and Dublin Core metadata into GFM Markdown.",
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
			"ZABW to Markdown — Convert Compressed AbiWord (.zabw) to Markdown Online | convrtr",
		h1: "Convert Compressed AbiWord (.zabw) to Markdown",
		intent:
			"Decompress and convert AbiWord compressed documents (.zabw) into clean GitHub Flavored Markdown directly in your browser. 100% offline client-side extraction with zero server uploads.",
		faq: [
			{
				q: "What is a ZABW (.zabw) file?",
				a: "ZABW is the Gzip-compressed XML document format of the cross-platform AbiWord word processor. It packages full word processor typography, Dublin Core metadata, tables, and nested styles into a compact compressed container.",
			},
			{
				q: "How does the client-side ZABW converter work?",
				a: "convrtr transparently inflates the Gzip stream in browser memory using WebAssembly/JavaScript, traverses the AWML XML document object model, maps character formats (bold, italic, strikethrough, monospace) to Markdown syntax, and formats tables and lists.",
			},
			{
				q: "Are my confidential AbiWord files uploaded anywhere?",
				a: "Never. All decompression, XML parsing, and Markdown generation occur strictly within your local browser sandbox. No file data is sent to external servers.",
			},
		],
		related: [
			"document/abw-to-markdown",
			"document/sxw-to-markdown",
			"document/sdw-to-markdown",
			"document/cwk-to-markdown",
			"document/rtf-to-markdown",
		],
	},
};
