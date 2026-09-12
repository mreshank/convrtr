import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-abiword-abw-to-markdown",
	title:
		"Converting AbiWord (.abw, .zabw) to Markdown: Open-Source Word Processing Recovery",
	description:
		"Examine AbiWord's native AWML XML document architecture. Learn how Dublin Core metadata, 2D table grids, styled character spans, GZIP compression, and base64 illustrations convert into clean Markdown.",
	publishedAt: "2026-09-13",
	tags: ["document", "abiword", "markdown", "open-source", "xml", "conversion"],
	relatedTools: [
		"document/abw-to-markdown",
		"document/rtf-to-markdown",
		"document/epub-to-markdown",
		"document/fb2-to-markdown",
	],
	bodyFormat: "mdx",
};
