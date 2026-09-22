import type { Tool } from "../../types";

export const scrivToMarkdown: Tool = {
	id: "document/scriv-to-markdown",
	slug: "scriv-to-markdown",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/zip", "application/octet-stream"],
		ext: ["scriv"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:scriv-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "markdown",
		presets: [
			{
				id: "markdown",
				label: "Markdown Manuscript",
				explanation:
					"Extracts the compiled manuscript Rich Text from inside a Scrivener project and converts it to Markdown — with no Scrivener install and no server.",
				params: { includeFrontmatter: true },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include Metadata Frontmatter",
				group: "Document",
				default: true,
			},
		],
	},
	seo: {
		title:
			"Scrivener to Markdown — Extract .scriv Project Without Scrivener | convrtr",
		h1: "Extract a Scrivener Project to Markdown",
		intent:
			"Open a Scrivener 3 (.scriv) app-template project bundle and pull the manuscript out as clean Markdown entirely in your browser. Works when the app won't — expired trial, lost licence key, old project on a new OS.",
		faq: [
			{
				q: "What is a Scrivener (.scriv) project?",
				a: "Scrivener is the long-form writing tool used for novels, theses, and screenplays. Its .scriv file is actually a ZIP package holding the manuscript as Rich Text plus folders, research, and settings metadata. No other writing app reads it.",
			},
			{
				q: "Why can't I just open my project in Scrivener?",
				a: "Common situations: the trial has expired, the licence key died with an old laptop, or the app won't install on a newer operating system. Scrivener's built-in help only points at the compile dialog, which requires the app to run — this converter does not.",
			},
			{
				q: "What does this extract, and how?",
				a: "It unzips the project in browser memory, reads the compiled manuscript (content.rtf in a Scrivener 3 package, or the individual Files/ documents in an older project), and converts the Rich Text to GitHub Flavored Markdown with the metadata preserved as frontmatter.",
			},
			{
				q: "Does my manuscript leave my computer?",
				a: "Never. The ZIP is decompressed and parsed locally with pure TypeScript and the platform's RTF parser. No file content is uploaded anywhere.",
			},
		],
		related: [
			"document/rtf-to-markdown",
			"document/rtfd-to-markdown",
			"document/enex-to-markdown",
			"document/pdb-to-markdown",
			"document/xmind-to-markdown",
		],
	},
};
