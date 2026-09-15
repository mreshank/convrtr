import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-mathematica-nb-notebooks-to-markdown",
	title:
		"Converting Wolfram Mathematica Notebooks (.nb) to Markdown: Hierarchical Expression Tree Extraction",
	description:
		"Learn how Wolfram Mathematica (.nb) computational notebooks store hierarchical expression trees and 2D box formulas, and how convrtr translates them to clean GitHub Flavored Markdown.",
	publishedAt: "2026-09-15",
	tags: [
		"document",
		"mathematica",
		"markdown",
		"notebook",
		"wolfram",
		"math",
		"science",
	],
	relatedTools: [
		"document/nb-to-markdown",
		"document/org-to-markdown",
		"document/latex-to-markdown",
		"document/rtfd-to-markdown",
	],
	bodyFormat: "mdx",
};
