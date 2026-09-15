import type { Tool } from "../../types";

export const cwkToMarkdown: Tool = {
	id: "document/cwk-to-markdown",
	slug: "cwk-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-clarisworks",
			"application/clarisworks",
			"application/x-appleworks",
			"application/appleworks",
			"application/octet-stream",
		],
		ext: ["cwk"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:cwk-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard Markdown",
				explanation:
					"Extracts ClarisWorks / AppleWorks document title, metadata, headings, bullet lists, and paragraphs into GitHub Flavored Markdown.",
				params: {
					includeFrontmatter: true,
				},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Frontmatter",
				group: "Metadata",
				default: true,
			},
		],
	},
	seo: {
		title:
			"CWK to Markdown — Convert ClarisWorks / AppleWorks (.cwk) to Markdown Online | convrtr",
		h1: "Convert ClarisWorks / AppleWorks (.cwk) to Markdown",
		intent:
			"Convert vintage ClarisWorks and AppleWorks documents (.cwk) into clean, readable GitHub Flavored Markdown directly in your browser. 100% private client-side extraction with zero server uploads.",
		faq: [
			{
				q: "What is a ClarisWorks / AppleWorks (.cwk) file?",
				a: "ClarisWorks (later renamed AppleWorks) was the premier integrated productivity suite for classic Macintosh and Windows throughout the 1990s and early 2000s. Its .cwk format stored word processing documents, spreadsheets, drawing canvases, and databases with proprietary binary structures.",
			},
			{
				q: "Why convert ClarisWorks files to Markdown?",
				a: "AppleWorks was discontinued in 2007, and modern versions of macOS, Pages, and Word can no longer open vintage .cwk documents. Converting to Markdown unlocks legacy notes, school assignments, and historical manuscripts as portable plain text.",
			},
			{
				q: "Does this converter support MacBinary wrapped .cwk files?",
				a: "Yes. The converter automatically detects and unpacks 128-byte MacBinary II headers (with 'CWRK' type and 'BOBO' creator signatures), recovering original file names and document streams.",
			},
			{
				q: "Are my documents uploaded to an external server?",
				a: "No. The entire decoding process executes strictly in your browser runtime. No files or private text leave your computer.",
			},
		],
		related: [
			"document/abw-to-markdown",
			"document/rtf-to-markdown",
			"document/hwp-to-markdown",
			"document/pdb-to-markdown",
			"document/org-to-markdown",
		],
	},
};
