import type { Tool } from "../../types";

export const canvasToMarkdown: Tool = {
	id: "document/canvas-to-markdown",
	slug: "canvas-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/json", "text/plain", "application/octet-stream"],
		ext: ["canvas"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:canvas-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Linear Notes",
				explanation:
					"Flattens every text, file, link and group node plus all labelled connections into titled Markdown sections. All node content transfers verbatim.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Canvas to Markdown — Obsidian Boards as Notes | convrtr",
		h1: "Convert Obsidian Canvas (.canvas) to Markdown",
		intent:
			"Turn an Obsidian / JSON Canvas whiteboard into linear Markdown notes — every card as a section, files and links referenced, connections listed — for search, print, screen readers and non-Obsidian collaborators. Entirely in your browser.",
		faq: [
			{
				q: "Why flatten a canvas at all?",
				a: "Canvases are brilliant spatially and opaque everywhere else: full-text search, printing, screen readers, diffing and sharing with non-Obsidian users all need linear text. This keeps the thinking while dropping the coordinates.",
			},
			{
				q: "What happens to file and link cards?",
				a: "File cards become [[vault links]], link cards become Markdown links, groups become titled sections — so references keep working when the notes land back in your vault.",
			},
			{
				q: "Do connections survive?",
				a: "Yes, as a Connections list (A —label— B) with node titles resolved. Spatial layout itself has no Markdown equivalent and is honestly dropped.",
			},
			{
				q: "Is my vault content uploaded anywhere?",
				a: "No. Parsing and rendering happen entirely inside your browser.",
			},
		],
		related: [
			"document/xmind-to-markdown",
			"document/mmap-to-markdown",
			"document/opml-to-markdown",
		],
	},
};
