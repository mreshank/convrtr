import type { Tool } from "../../types";

export const pdbToMarkdown: Tool = {
	id: "document/pdb-to-markdown",
	slug: "pdb-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.palm",
			"application/x-pilot",
			"application/x-palm-database",
			"application/octet-stream",
		],
		ext: ["pdb", "prc"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:pdb-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Standard Markdown",
				explanation:
					"Decompresses PalmDoc LZ77 records, extracts database metadata into frontmatter, formats chapter headings, and generates GitHub Flavored Markdown.",
				params: {
					includeFrontmatter: true,
					detectHeadings: true,
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
			{
				control: "toggle",
				key: "detectHeadings",
				label: "Detect Chapter Headings",
				group: "Structure",
				default: true,
			},
		],
	},
	seo: {
		title:
			"PDB to Markdown — Convert PalmDoc (.pdb) to Markdown Online | convrtr",
		h1: "Convert PalmDoc (.pdb) to Markdown",
		intent:
			"Convert vintage Palm OS PalmDoc / AportisDoc (.pdb, .prc) eBook databases into clean, structured GitHub Flavored Markdown directly in your browser. 100% private client-side LZ77 decompression with zero server uploads.",
		faq: [
			{
				q: "What is a PalmDoc (.pdb) file?",
				a: "PalmDoc (also known as AportisDoc or Palm Database format with 'TEXt' or 'REAd' type) was the universal eBook and document format for Palm OS handhelds (PalmPilot, Handspring Visor, Sony CLIÉ, Palm Treo). It packages documents into 4096-byte compressed record blocks using a proprietary LZ77 variant.",
			},
			{
				q: "Why convert PalmDoc PDB files to Markdown?",
				a: "Modern devices, smartphones, and note-taking apps (Obsidian, Notion, Logseq) cannot open Palm OS database files. Converting PalmDoc files to Markdown extracts the text, restores chapter headings, and makes vintage digital manuscripts readable everywhere.",
			},
			{
				q: "How does the in-browser PalmDoc decompressor work?",
				a: "The converter reads the 78-byte Palm Database record directory, locates PalmDoc Record 0 to inspect compression parameters, and decompresses each block using pure TypeScript sliding-window LZ77 algorithms, resolving literal runs, 2-byte distance offsets, and space-prefixed character tokens.",
			},
			{
				q: "Are my documents or notes uploaded to a server?",
				a: "Never. All parsing, decompression, and Markdown structuring run entirely client-side in your browser's local memory. Your files are never sent over the internet.",
			},
		],
		related: [
			"document/epub-to-markdown",
			"document/fb2-to-markdown",
			"document/rtf-to-markdown",
			"document/opml-to-markdown",
		],
	},
};
