import type { Tool } from "../../types";

export const discordToMarkdown: Tool = {
	id: "document/discord-to-markdown",
	slug: "discord-to-markdown",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/json", "text/plain", "application/octet-stream"],
		ext: ["json"],
	},
	output: { ext: "md", mime: "text/markdown" },
	engines: ["extract:discord-to-markdown"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Archival Markdown",
				explanation:
					"Renders every message with attachments, embeds and reaction summaries from DiscordChatExporter JSON into dated Markdown sections. Message text is preserved verbatim.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Discord to Markdown — Archive Channels as Notes | convrtr",
		h1: "Convert Discord Export (JSON) to Markdown",
		intent:
			"Turn a DiscordChatExporter JSON export into clean dated Markdown for community archives, moderation records, research or legal preservation. Attachments, embeds and reactions summarised, participants rostered — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "How do I export from Discord?",
				a: "Use the community-standard DiscordChatExporter (Tyrrrz) to export a channel or DM as JSON, then drop that file here. Discord's own privacy-portal dump is raw and unreadable — this is the readable path.",
			},
			{
				q: "Are attached images included?",
				a: "Attachments and embeds are listed with filenames and URLs in an inline manifest; reaction counts are summarised per message. Files themselves live on Discord's CDN, so links are preserved verbatim before they rot.",
			},
			{
				q: "Why Markdown instead of the exporter's HTML?",
				a: "HTML is for reading; Markdown is for keeping — searchable, version-controllable, importable into Obsidian, Logseq or evidence systems. Both have their place; this is the archival one.",
			},
			{
				q: "Is my server's history uploaded anywhere?",
				a: "No. Parsing and rendering happen entirely inside your browser.",
			},
		],
		related: [
			"document/telegram-to-markdown",
			"document/whatsapp-to-markdown",
			"document/mhtml-to-html",
		],
	},
};
