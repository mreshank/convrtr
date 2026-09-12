import type { Tool } from "../../types";

export const opmlToMarkdown: Tool = {
	id: "document/opml-to-markdown",
	slug: "opml-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/x-opml",
			"application/xml",
			"text/xml",
			"application/opml+xml",
			"application/octet-stream",
		],
		ext: ["opml", "xml"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:opml-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard Markdown with Frontmatter & Feed Tables",
				explanation:
					"Transforms OPML outlines and RSS subscription feeds into clean GitHub Flavored Markdown with YAML metadata headers and structured feed comparison tables.",
				params: { includeFrontmatter: true, renderFeedsAsTable: true },
			},
			{
				id: "pure-outline",
				label: "Hierarchical Outline Lists Only",
				explanation:
					"Converts all OPML nodes into nested Markdown bullet lists and task checkboxes without generating comparison tables.",
				params: { includeFrontmatter: false, renderFeedsAsTable: false },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "includeFrontmatter",
				label: "Include YAML Frontmatter",
				group: "Metadata",
				default: true,
			},
			{
				control: "toggle",
				key: "renderFeedsAsTable",
				label: "Render RSS Feeds as Markdown Tables",
				group: "Formatting",
				default: true,
			},
		],
	},
	seo: {
		title:
			"OPML to Markdown — Convert OPML Outlines & RSS Subscriptions to Markdown | convrtr",
		h1: "Convert OPML (.opml) to Markdown",
		intent:
			"Convert Outline Processor Markup Language (.opml) files, RSS feed subscriptions, podcast directories, and hierarchical mindmaps into clean GitHub Flavored Markdown. 100% client-side with zero server uploads.",
		faq: [
			{
				q: "What is an OPML (.opml) file?",
				a: "OPML (Outline Processor Markup Language) is an XML-based file format originally developed by Dave Winer for outliner applications. Today, it is the universal standard for exporting and importing RSS / Atom feed reader subscriptions (Feedly, Inoreader, NetNewsWire), podcast directories (Pocket Casts, Overcast), and hierarchical task outlines (Workflowy, OmniOutliner, Dynalist).",
			},
			{
				q: "Why convert OPML files to Markdown?",
				a: "Exporting OPML subscriptions and outlines into Markdown enables users to document reading lists in Obsidian, create structured RSS directories on GitHub, archive podcast libraries, and maintain hierarchical task outlines in human-readable plain text without vendor lock-in.",
			},
			{
				q: "How does convrtr handle RSS feeds and task outlines?",
				a: "convrtr intelligently detects feed lists and organizes them into clean Markdown reference tables with website links and feed URLs. For general outlines, it preserves nested parent-child indentation, translates completion statuses into GFM checkboxes (- [ ] / - [x]), and formats notes as indented quotes.",
			},
			{
				q: "Are my subscription feeds and outline notes uploaded to any server?",
				a: "Never. All XML parsing, attribute extraction, table generation, and Markdown formatting execute 100% locally in your browser memory. Your personal subscriptions and private outline notes never touch an external server.",
			},
		],
		related: [
			"document/enex-to-markdown",
			"document/org-to-markdown",
			"document/xmind-to-markdown",
			"document/epub-to-markdown",
		],
	},
};
