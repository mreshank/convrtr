import type { Tool } from "../../types";

export const mcrToZip: Tool = {
	id: "document/mcr-to-zip",
	slug: "mcr-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-psx-memorycard"],
		ext: ["mcr", "mcd", "srm", "vmp", "psx"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:mcr-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "zip",
		presets: [
			{
				id: "zip",
				label: "Save Files & Icons ZIP (.zip)",
				explanation:
					"Carves all game saves into standard .mcs single-save files, raw block dumps, decoded 16x16 icon PNGs, and a markdown summary.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Card Manifest (.json)",
				explanation:
					"Extracts block usage statistics, product codes, and Shift-JIS game titles as structured JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "MCR to ZIP — Extract PS1 Memory Card Saves Online | convrtr",
		h1: "Extract PlayStation 1 Memory Card Saves and Icons",
		intent:
			"Extract individual game saves (.mcs, .raw) and animated save icons (.png) from 128KB PlayStation 1 Memory Card files (.mcr, .mcd, .srm, .vmp) directly in your browser. Compatible with DuckStation, RetroArch, and real hardware.",
		faq: [
			{
				q: "What is an .mcr file?",
				a: "An .mcr file is a raw 128KB flash memory dump of a Sony PlayStation 1 Memory Card, containing 16 blocks of 8KB storing game saves, product IDs, and custom 16x16 icon graphics.",
			},
			{
				q: "What is an .mcs file?",
				a: "An .mcs file is the universal single-game save format containing a 128-byte directory frame followed by save data blocks. It can be imported directly into DuckStation, Mednafen, and real PS1 memory cards using MemcardRex or DexDrive.",
			},
			{
				q: "Are DexDrive and RetroArch saves supported?",
				a: "Yes. DexDrive headers (131,136 bytes), standard raw images (131,072 bytes), and emulator saves (.mcd, .srm, .vmp) are automatically detected and parsed.",
			},
			{
				q: "Are memory card files uploaded anywhere?",
				a: "No. All block scanning, icon palette decoding, and ZIP archiving execute 100% locally in your browser memory.",
			},
		],
		related: [
			"document/wad-to-zip",
			"document/pak-to-zip",
			"document/bsp-to-zip",
		],
	},
};
