import type { Tool } from "../../types";

export const bupToZip: Tool = {
	id: "document/bup-to-zip",
	slug: "bup-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-saturn-save"],
		ext: ["bup", "bin"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:bup-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "zip",
		presets: [
			{
				id: "zip",
				label: "Extracted Saves ZIP (.zip)",
				explanation:
					"Carves Sega Saturn backup memory dumps and .bup files into individual .bup saves, raw binary payloads, and a markdown summary.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Save Directory Manifest (.json)",
				explanation:
					"Extracts game save identifiers, comments, language flags, byte sizes, and timestamps as structured JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "BUP to ZIP — Extract Sega Saturn Backup Saves | convrtr",
		h1: "Extract Sega Saturn Backup Memory (.bup) Saves",
		intent:
			"Carve and extract individual game save files from Sega Saturn internal backup RAM, Action Replay, Saroo, and cartridge memory dumps (.bup/.bin) directly in your browser.",
		faq: [
			{
				q: "What is a Sega Saturn .bup save file?",
				a: "Sega Saturn consoles manage game progress across 64-byte blocks using the BackUpRam format. The community .bup format wraps individual saves with a 64-byte metadata header containing game name, comment, language, and timestamp.",
			},
			{
				q: "Can this parse full internal RAM dumps?",
				a: "Yes. Both 32KB internal console RAM dumps, cartridge backups (Saroo, Action Replay, MiSTer), and standalone .bup files are supported.",
			},
			{
				q: "How are timestamps decoded?",
				a: "Saturn BIOS records timestamps as minutes elapsed since January 1, 1980 UTC. convrtr calculates the exact ISO 8601 calendar date and time for each save.",
			},
		],
		related: [
			"document/mcr-to-zip",
			"document/gci-to-json",
			"image/tim-to-png",
		],
	},
};
