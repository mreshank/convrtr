import type { Tool } from "../../types";

export const troffToMarkdown: Tool = {
	id: "document/troff-to-markdown",
	slug: "troff-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-troff",
			"text/troff",
			"text/x-troff",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["tr", "troff", "t", "roff"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:troff-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard GFM Markdown",
				explanation:
					"Converts AT&T troff source documents, three-part titles, and macro packages into clean GitHub Flavored Markdown.",
				params: { preserveRawRequests: false },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "preserveRawRequests",
				label: "Preserve Unrecognized Requests",
				group: "Output",
				default: false,
			},
		],
	},
	seo: {
		title:
			"TROFF to Markdown — Convert AT&T Troff Documents to Markdown Online | convrtr",
		h1: "Convert AT&T Troff (.tr / .troff) to Markdown",
		intent:
			"Convert classic AT&T troff typography documents (.tr, .troff, .t) into clean GitHub Flavored Markdown directly in your browser. Translates primitive requests and macros (ms, me, mm) with preserved headings, lists, and verbatim code blocks 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is an AT&T Troff (.tr / .troff) file?",
				a: "Troff (short for 'typesetter roff') is a classic typography and document layout program developed in 1973 by Joe Ossanna and Brian Kernighan at AT&T Bell Laboratories. It was used to typeset seminal computing literature including The C Programming Language (K&R) and Unix system documentation.",
			},
			{
				q: "How does convrtr convert Troff documents to Markdown?",
				a: "convrtr evaluates troff primitive requests (.tl, .sp, .br, .ce, .nf/.fi), expands string registers (\\*(name), and processes classical macro conventions (.TL, .NH, .SH, .PP, .IP, .QP), translating them into structured Markdown headings, blockquotes, and code fences.",
			},
			{
				q: "Are my documents sent to remote cloud servers?",
				a: "Never. All text decoding, escape sequence resolution, and Markdown synthesis occur entirely client-side inside your browser sandbox. No file data is ever uploaded.",
			},
		],
		related: [
			"document/man-to-markdown",
			"document/texinfo-to-markdown",
			"document/latex-to-markdown",
			"document/lyx-to-markdown",
			"document/org-to-markdown",
		],
	},
};
