import type { Tool } from "../../types";

export const xmindToMarkdown: Tool = {
	id: "document/xmind-to-markdown",
	slug: "xmind-to-markdown",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/vnd.xmind.workbook",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["xmind"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:xmind-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Traverses the mindmap node tree and transforms topics, subtopics, and notes into clean hierarchical Markdown with full fidelity.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"XMind to Markdown — Convert .xmind Mind Maps to Markdown Notes | convrtr",
		h1: "Convert XMind to Markdown",
		intent:
			"Convert XMind (.xmind) mindmaps into clean, structured Markdown documents for Obsidian, Notion, Logseq, or GitHub. Instant client-side conversion without paying for XMind subscription or uploading notes to third parties.",
		faq: [
			{
				q: "Does this require an active XMind Pro subscription?",
				a: "No. XMind files package your topic hierarchy inside as a standard JSON document. This tool reads that structure directly in your browser and formats it into Markdown without requiring any proprietary software or subscriptions.",
			},
			{
				q: "Will this import into Obsidian or Notion?",
				a: "Yes! The exported Markdown uses standard heading hierarchy (#, ##, ###) and nested bullet lists with blockquotes for notes, making it 100% compatible with Obsidian, Notion, Roam, Logseq, and Bear.",
			},
			{
				q: "Are my mindmaps kept private?",
				a: "Yes. All parsing happens in your browser's memory using local JavaScript. Your brainstorming notes and confidential project plans are never sent to any server.",
			},
		],
		related: [],
	},
};
