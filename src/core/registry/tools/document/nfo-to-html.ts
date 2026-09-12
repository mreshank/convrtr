import type { Tool } from "../../types";

export const nfoToHtml: Tool = {
	id: "document/nfo-to-html",
	slug: "nfo-to-html",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/x-nfo",
			"application/x-nfo",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["nfo", "diz"],
	},
	output: { ext: "html", mime: "text/html" },
	engines: ["extract:nfo-to-html"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Dark Terminal HTML",
				explanation:
					"Decodes IBM PC Code Page 437 extended ASCII art into modern UTF-8 and renders a responsive dark-mode monospaced terminal view.",
				params: { theme: "dark", format: "html" },
			},
			{
				id: "visually-lossless",
				label: "Matrix Green Cyber Terminal",
				explanation:
					"Renders ASCII/ANSI art with classic CRT phosphor green text on a deep black terminal background.",
				params: { theme: "matrix", format: "html" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "theme",
				label: "Terminal Display Theme",
				group: "Styling",
				default: "dark",
				options: [
					{ value: "dark", label: "Charcoal Dark (Default)" },
					{ value: "matrix", label: "Matrix CRT Green" },
					{ value: "amber", label: "Vintage Amber Phosphor" },
					{ value: "plain", label: "Paper Light" },
				],
			},
			{
				control: "select",
				key: "format",
				label: "Output Format",
				group: "Output",
				default: "html",
				options: [
					{ value: "html", label: "Styled HTML Web Page" },
					{ value: "txt", label: "Clean UTF-8 Plain Text (.txt)" },
				],
			},
		],
	},
	seo: {
		title:
			"NFO to HTML — View & Convert CP437 ASCII Art (.nfo, .diz) | convrtr",
		h1: "Convert & View NFO (.nfo, .diz) Scene Art in HTML",
		intent:
			"Convert and view vintage IBM CP437 ASCII and ANSI .nfo scene artwork and FILE_ID.DIZ descriptions in responsive, styled HTML or clean UTF-8 text directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "Why do .nfo files look like garbled gibberish when opened?",
				a: "NFO files were authored in MS-DOS using IBM Code Page 437 (CP437), an 8-bit character encoding featuring box-drawing lines, shading blocks, and graphic glyphs. Modern operating systems and text editors assume UTF-8 or Windows-1252, causing the extended 8-bit graphics to render as broken symbols. convrtr translates raw CP437 bytes directly into correct Unicode characters.",
			},
			{
				q: "What is the difference between .nfo and .diz files?",
				a: "Both formats use identical CP437 encoding and ASCII art conventions. .nfo (Info) files contain release notes, system requirements, and ASCII art from software groups. .diz (Description in Zip) files are concise 10-line summaries designed to describe BBS zip archives.",
			},
			{
				q: "Can I save the output as plain UTF-8 text?",
				a: "Yes! In Advanced Settings, switch the Output Format from 'HTML' to 'Clean UTF-8 Plain Text (.txt)' to download a text file with box-drawing Unicode characters that opens cleanly in any modern editor.",
			},
			{
				q: "Are my files uploaded to a remote server?",
				a: "Never. All CP437 decoding, HTML formatting, and text escaping occur 100% locally inside your browser memory using pure TypeScript. No data is ever transmitted over the network.",
			},
		],
		related: [
			"document/bibtex-to-markdown",
			"document/latex-to-markdown",
			"document/rtf-to-markdown",
		],
	},
};
