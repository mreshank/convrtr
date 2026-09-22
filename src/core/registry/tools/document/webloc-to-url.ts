import type { Tool } from "../../types";

export const weblocToUrl: Tool = {
	id: "document/webloc-to-url",
	slug: "webloc-to-url",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/xml",
			"text/xml",
			"application/x-plist",
			"application/octet-stream",
		],
		ext: ["webloc"],
	},
	output: { ext: "url", mime: "text/plain" },
	engines: ["extract:webloc-to-url"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "url",
		presets: [
			{
				id: "url",
				label: "Windows Shortcut (.url)",
				explanation:
					"Converts macOS Safari .webloc to standard Windows InternetShortcut file format, clickable in Windows File Explorer.",
				params: { format: "url" },
			},
			{
				id: "html",
				label: "HTML Redirect (.html)",
				explanation:
					"Generates a cross-platform HTML document that immediately redirects to the target address when opened in any browser.",
				params: { format: "html" },
			},
			{
				id: "markdown",
				label: "Markdown Link (.md)",
				explanation:
					"Extracts URL and title as a clean Markdown hyperlink [Title](URL) for notes and documentation.",
				params: { format: "markdown" },
			},
			{
				id: "txt",
				label: "Plain Text URL (.txt)",
				explanation: "Extracts the raw web address as clean plain text.",
				params: { format: "txt" },
			},
		],
		advanced: [],
	},
	seo: {
		title: "WEBLOC to URL — Convert macOS Safari Shortcut | convrtr",
		h1: "Convert WEBLOC to Windows URL Shortcut",
		intent:
			"Convert Apple Safari .webloc internet shortcut files to standard Windows .url shortcuts, HTML redirect documents, or Markdown links. Runs 100% in your browser with zero data uploaded.",
		faq: [
			{
				q: "Why can Windows not open .webloc files?",
				a: "macOS Safari saves web shortcuts as Apple Property Lists (XML or binary plist). Windows uses INI-style .url files and does not recognize .webloc containers without conversion.",
			},
			{
				q: "Which output format should I select?",
				a: "Select Windows Shortcut (.url) if you want a clickable desktop shortcut on Windows, HTML Redirect for a universal file that opens in any browser, or Markdown Link for Obsidian/Notion.",
			},
			{
				q: "Are binary bplist00 files supported?",
				a: "Yes. Both classic XML property lists and compiled binary bplist00 Safari shortcuts are automatically parsed and extracted.",
			},
			{
				q: "Is any data uploaded to a server?",
				a: "No. The entire extraction and conversion executes locally in your browser.",
			},
		],
		related: [
			"document/mhtml-to-html",
			"document/webarchive-to-html",
			"document/opml-to-markdown",
		],
	},
};
