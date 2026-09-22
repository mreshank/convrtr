import type { Tool } from "../../types";

export const mobiToMarkdown: Tool = {
	id: "document/mobi-to-markdown",
	slug: "mobi-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-mobipocket-ebook", "application/octet-stream"],
		ext: ["mobi", "prc"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:mobi-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Book Text",
				explanation:
					"Decodes PalmDoc text records and flattens the HTML-subset markup to Markdown with chapter detection and real metadata frontmatter. Text transfers exactly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "MOBI to Markdown — DRM-Free Kindle Books as Notes | convrtr",
		h1: "Convert MOBI Ebook to Markdown",
		intent:
			"Turn a DRM-free Mobipocket (.mobi/.prc) ebook — Project Gutenberg classics, publisher DRM-free editions, your own drafts — into clean Markdown with author, ISBN and chapter structure for notes, research and archiving. Encrypted and Huffdic books are refused with specific errors, never garbage. Entirely in your browser.",
		faq: [
			{
				q: "Will this unlock my Kindle purchase?",
				a: "No — and it never will. Encrypted books fail with an explicit DRM error. This converts DRM-free books you own: public-domain classics, DRM-free publisher editions, and personal documents.",
			},
			{
				q: "What about .azw, .azw3 or .kfx?",
				a: "Different formats despite the family resemblance: Topaz (.azw) and KF8 (.azw3) structures aren't Mobipocket and are refused with a clear message instead of corrupt output.",
			},
			{
				q: "Do images survive?",
				a: "No — output is text Markdown with metadata frontmatter (title, author, publisher, ISBN, language). Illustrations need an EPUB/HTML pipeline; this is the reading/notes direction.",
			},
			{
				q: "Is my library uploaded anywhere?",
				a: "No. PalmDB, MOBI, EXTH and LZ77 decoding all run inside your browser.",
			},
		],
		related: [
			"document/epub-to-markdown",
			"document/pdb-to-markdown",
			"document/fb2-to-markdown",
		],
	},
};
