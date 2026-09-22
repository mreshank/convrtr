import type { Tool } from "../../types";

export const mmapToMarkdown: Tool = {
	id: "document/mmap-to-markdown",
	slug: "mmap-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.mindjet.mindmanager",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["mmap"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:mmap-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Task-Aware Outline",
				explanation:
					"Walks the Document.xml topic tree into a Markdown outline with task checkboxes, progress, notes and links. Structure and text transfer exactly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "MMAP to Markdown — MindManager Maps Without MindManager | convrtr",
		h1: "Convert MindManager (.mmap) to Markdown",
		intent:
			"Free the thinking out of MindManager (.mmap) maps into a Markdown outline — topics, task checkboxes with progress, notes and links — without a MindManager licence. Entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "I left MindManager / my trial expired. Is my map lost?",
				a: "No. An .mmap is a ZIP holding Document.xml with the full topic tree. This tool walks that tree into a clean outline, so years of planning survive the subscription.",
			},
			{
				q: "Do tasks and checkboxes survive?",
				a: "Yes — topics with Task data become - [ ] / - [x] items (Progress=100 counts as done), with progress percentages and due metadata kept alongside.",
			},
			{
				q: "What about images, icons and styling?",
				a: "Dropped, honestly: Markdown has no fields for map styling. Topic text, hierarchy, tasks, notes and hyperlinks — the content — transfer completely.",
			},
			{
				q: "Is my proprietary planning data uploaded anywhere?",
				a: "No. Unpacking and parsing run entirely inside your browser.",
			},
		],
		related: [
			"document/xmind-to-markdown",
			"document/opml-to-markdown",
			"document/enex-to-markdown",
		],
	},
};
