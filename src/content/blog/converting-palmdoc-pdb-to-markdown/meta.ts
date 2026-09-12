import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-palmdoc-pdb-to-markdown",
	title:
		"Converting PalmDoc (PDB) to Markdown: Vintage Handheld E-Book Architecture",
	description:
		"Explore the Palm OS PalmDoc (.pdb / .prc) architecture. Discover 78-byte database headers, record indices, 4KB LZ77 compressed blocks, and browser-based Markdown extraction.",
	publishedAt: "2026-09-13",
	tags: ["ebooks", "palmdoc", "pdb", "markdown", "retro", "pda"],
	relatedTools: [
		"document/pdb-to-markdown",
		"document/epub-to-markdown",
		"document/fb2-to-markdown",
		"document/opml-to-markdown",
	],
	bodyFormat: "mdx",
};
