import type { Tool } from "../../types";

export const telegramToMarkdown: Tool = {
	id: "document/telegram-to-markdown",
	slug: "telegram-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/json", "text/plain", "application/octet-stream"],
		ext: ["json"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:telegram-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Archival Markdown",
				explanation:
					"Renders every message, service event and media marker from single-chat and full-export files into dated Markdown sections. Text and links are preserved verbatim.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Telegram to Markdown — Archive Chats as Notes | convrtr",
		h1: "Convert Telegram Export (JSON) to Markdown",
		intent:
			"Turn a Telegram Desktop JSON export (single chat or full result.json) into clean dated Markdown for Obsidian, Logseq, research archives or legal records. Rich-text links, service events and media markers preserved — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "How do I export from Telegram?",
				a: "On Telegram Desktop: Settings > Advanced > Export Telegram data. Choose JSON (machine-readable) for a single chat or everything. Drop the resulting .json file here.",
			},
			{
				q: "Does it handle full account exports with many chats?",
				a: "Yes — a full result.json becomes one dated section per chat, each with its own participants roster, so a whole account archive stays navigable.",
			},
			{
				q: "What happens to photos, voice messages and stickers?",
				a: "They render as markers like [Photo 1920x1080] or [Voice message 12s] inline, so the record shows something was shared and what kind — media bytes live in the export folder alongside the JSON.",
			},
			{
				q: "Are my private chats uploaded anywhere?",
				a: "No. Parsing and rendering happen entirely inside your browser — your conversations never touch a server.",
			},
		],
		related: [
			"document/whatsapp-to-markdown",
			"document/discord-to-markdown",
			"document/mhtml-to-html",
		],
	},
};
