import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-hangul-word-processor-hwp-to-markdown",
	title:
		"Converting Hangul Word Processor (HWP) to Markdown: OLE CFB & Deflate Forensics",
	description:
		"Unpack Hancom Hangul HWP 5.x compound documents. Discover how OLE 2.0 CFB directory tables, Deflate stream decompression, and HWPTAG_PARA_TEXT record parsers extract clean Markdown in browser memory.",
	publishedAt: "2026-09-13",
	tags: ["document", "hwp", "hangul", "markdown", "forensics", "ole"],
	relatedTools: [
		"document/hwp-to-markdown",
		"document/abw-to-markdown",
		"document/rtf-to-markdown",
		"document/epub-to-markdown",
		"document/pdb-to-markdown",
	],
	bodyFormat: "mdx",
};
