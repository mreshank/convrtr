import type { Tool } from "../../types";

export const manToMarkdown: Tool = {
	id: "document/man-to-markdown",
	slug: "man-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-troff-man",
			"text/troff",
			"text/x-troff",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["man", "1", "2", "3", "4", "5", "6", "7", "8"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:man-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard GFM Markdown",
				explanation:
					"Converts roff, man, and mdoc macro documentation into GitHub Flavored Markdown with clean headings, code blocks, and definition lists.",
				params: { preserveRawMacros: false },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "preserveRawMacros",
				label: "Preserve Unrecognized Macros",
				group: "Output",
				default: false,
			},
		],
	},
	seo: {
		title:
			"MAN to Markdown — Convert Unix Man Pages to Markdown Online | convrtr",
		h1: "Convert Unix Man Page (.man) to Markdown",
		intent:
			"Convert vintage and modern Unix manual pages (.man, .1..8) into clean GitHub Flavored Markdown directly in your browser. Translates roff, man, and mdoc macros with headings, lists, and verbatim blocks 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Unix Man page file?",
				a: "Man pages are software documentation files written in roff typesetting markup, traditionally viewed via the man command on Unix, Linux, and BSD systems. They use macro packages such as groff_man(7) or mdoc(7) to structure software reference manuals into standard sections.",
			},
			{
				q: "How does convrtr convert roff man pages to Markdown?",
				a: "convrtr parses roff macro directives (.TH, .SH, .SS, .TP, .IP, .nf/.fi) as well as BSD mdoc macros (.Sh, .Nm, .Nd, .Fl, .Ar), converting them into standard Markdown headings, definition lists, fenced code blocks, and styled inline text.",
			},
			{
				q: "Are my manual files sent to a server?",
				a: "Never. All roff tokenization, macro parsing, and Markdown generation happen 100% client-side in your web browser with zero external network requests.",
			},
		],
		related: [
			"document/texinfo-to-markdown",
			"document/lyx-to-markdown",
			"document/latex-to-markdown",
			"document/rst-to-markdown",
			"document/org-to-markdown",
		],
	},
};
