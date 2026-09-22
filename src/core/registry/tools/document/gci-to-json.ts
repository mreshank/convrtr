import type { Tool } from "../../types";

export const gciToJson: Tool = {
	id: "document/gci-to-json",
	slug: "gci-to-json",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-gamecube-save"],
		ext: ["gci", "raw", "gcp", "mpk"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:gci-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "json",
		presets: [
			{
				id: "json",
				label: "Save Metadata (.json)",
				explanation:
					"Extracts GameCube game titles, company publishers, Shift-JIS comments, block counts, and timestamps as JSON.",
				params: { zip: false },
			},
			{
				id: "zip",
				label: "Carved Saves & Icons (.zip)",
				explanation:
					"Carves individual .gci save files from raw memory card dumps and exports decoded 32x32 save icons into a ZIP.",
				params: { zip: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "GCI to JSON — Inspect & Extract GameCube Saves | convrtr",
		h1: "Inspect and Extract Nintendo GameCube Saves",
		intent:
			"Inspect Nintendo GameCube save files (.gci) and raw memory card dumps (.raw, .gcp, .mpk) in your browser. View Shift-JIS save comments, extract game icons (.png), and export individual Dolphin emulator saves.",
		faq: [
			{
				q: "What is a .gci file?",
				a: "A .gci file is a Nintendo GameCube single-game save file format used by Dolphin emulator, Swiss homebrew, and GCMM (GameCube Memory Card Manager). It includes a 64-byte header followed by game data blocks.",
			},
			{
				q: "Can I carve saves from raw memory card dumps?",
				a: "Yes. Raw 512KB (59 block), 2MB (251 block), and 8MB (1019 block) memory card dumps (.raw, .gcp, .mpk) are automatically scanned, extracting all stored saves into separate .gci files.",
			},
			{
				q: "Are Japanese Shift-JIS comments supported?",
				a: "Yes. Dual 32-byte comment lines stored in Japanese Shift-JIS or Western ASCII are decoded into clean UTF-8 text.",
			},
			{
				q: "Is my save file uploaded anywhere?",
				a: "No. All parsing, banner/icon decoding, and ZIP generation run 100% locally in your web browser.",
			},
		],
		related: [
			"document/mcr-to-zip",
			"document/sol-to-json",
			"document/cue-to-json",
		],
	},
};
