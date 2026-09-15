import type { Tool } from "../../types";

export const texinfoToMarkdown: Tool = {
	id: "document/texinfo-to-markdown",
	slug: "texinfo-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-texinfo",
			"text/x-texinfo",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["texi", "texinfo"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:texinfo-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard GFM Markdown",
				explanation:
					"Converts Texinfo chapters, code examples, tables, and itemized lists into clean GitHub Flavored Markdown.",
				params: { preserveNodeAnchors: false },
			},
			{
				id: "anchors",
				label: "Preserve HTML Node Anchors",
				explanation:
					"Injects HTML anchor tags for all @node directives to preserve internal document cross-referencing.",
				params: { preserveNodeAnchors: true },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "preserveNodeAnchors",
				label: "Preserve Node Anchor Tags",
				group: "Output",
				default: false,
			},
		],
	},
	seo: {
		title:
			"Texinfo to Markdown — Convert GNU Texinfo Documents to Markdown Online | convrtr",
		h1: "Convert GNU Texinfo (.texi) to Markdown",
		intent:
			"Parse and convert GNU Texinfo technical manuals and documentation files (.texi, .texinfo) into clean, readable GitHub Flavored Markdown directly in your browser. Runs 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a GNU Texinfo (.texi) file?",
				a: "Texinfo is the official documentation system of the GNU Project, designed by Richard Stallman and Robert Chassell. A single Texinfo source file can be typeset into printed manuals (PDF/DVI), online hypertext (HTML, Info), or plain text. It is used across GNU software including GCC, Emacs, Bash, Make, and Coreutils.",
			},
			{
				q: "How does convrtr convert Texinfo files?",
				a: "convrtr parses Texinfo structural commands (@chapter, @section), code environments (@example, @lisp), definitions (@table), and inline semantic macros (@code, @var, @uref), translating them directly into standard GitHub Flavored Markdown with clean tables and lists.",
			},
			{
				q: "Are my documentation files uploaded to any external servers?",
				a: "No. All text parsing, macro evaluation, and Markdown generation run strictly client-side inside your browser sandbox. No file data is ever transmitted across the internet.",
			},
		],
		related: [
			"document/lyx-to-markdown",
			"document/latex-to-markdown",
			"document/org-to-markdown",
			"document/bibtex-to-markdown",
		],
	},
};
