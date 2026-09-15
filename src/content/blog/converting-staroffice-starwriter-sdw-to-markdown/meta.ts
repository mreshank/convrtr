import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-staroffice-starwriter-sdw-to-markdown",
	title:
		"Converting StarOffice & StarWriter (SDW) to Markdown: OLE Compound Binary Forensics",
	description:
		"Recover text, headings, bullet lists, and metadata from vintage StarOffice 3.x–5.x (.sdw) word processing documents. Learn how OLE CFB streams unpack to GitHub Flavored Markdown.",
	publishedAt: "2026-09-15",
	tags: [
		"document",
		"sdw",
		"staroffice",
		"starwriter",
		"markdown",
		"forensics",
		"ole",
	],
	relatedTools: [
		"document/sdw-to-markdown",
		"document/sxw-to-markdown",
		"document/abw-to-markdown",
		"document/cwk-to-markdown",
		"document/hwp-to-markdown",
	],
	bodyFormat: "mdx",
};
