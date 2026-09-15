import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-unix-man-pages-to-markdown",
	title: "Converting Unix Man Pages to Markdown: Modernizing Terminal Documentation",
	description:
		"Transform vintage and modern Unix roff and BSD mdoc manual pages into clean GitHub Flavored Markdown. Learn how macro packages convert to web-ready documentation.",
	publishedAt: "2026-09-15",
	tags: ["document", "man", "roff", "unix", "linux", "markdown", "gfm"],
	relatedTools: [
		"document/man-to-markdown",
		"document/texinfo-to-markdown",
		"document/lyx-to-markdown",
		"document/latex-to-markdown",
		"document/org-to-markdown",
	],
	bodyFormat: "mdx",
};
