import type { Tool } from "../../types";

export const ndsToPng: Tool = {
	id: "image/nds-to-png",
	slug: "nds-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-nintendo-ds-rom"],
		ext: ["nds", "dsi"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:nds-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "png",
		presets: [
			{
				id: "png",
				label: "Cartridge Icon PNG (.png)",
				explanation:
					"Extracts and decodes the 32x32 4-bpp tiled BGR555 cartridge banner icon into a transparent 32-bit PNG image.",
				params: { json: false },
			},
			{
				id: "json",
				label: "ROM Metadata & Banners (.json)",
				explanation:
					"Extracts game serial code, maker, unit type, and 6-language localized title banners (Japanese, English, French, German, Italian, Spanish) as JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "NDS to PNG — Extract Nintendo DS Banner Icon to PNG | convrtr",
		h1: "Extract Nintendo DS ROM Banner Icons to PNG",
		intent:
			"Extract the official 32x32 pixel banner icon and localized multi-language titles from Nintendo DS and DSi ROM files (.nds/.dsi) directly in your browser.",
		faq: [
			{
				q: "What is an NDS ROM banner icon?",
				a: "Nintendo DS (.nds) and DSi (.dsi) cartridge ROMs contain a dedicated banner structure referenced in the 512-byte header holding a 32x32 pixel 4-bpp graphic arranged in 16 8x8 tiles with a 16-color BGR555 hardware palette.",
			},
			{
				q: "What titles are extracted?",
				a: "The tool extracts the official localized game titles in all 6 hardware languages: Japanese, English, French, German, Italian, and Spanish.",
			},
			{
				q: "Does this upload my ROM file?",
				a: "No. Slicing and icon decoding occur 100% locally in your browser memory. No ROM data is ever sent to an external server.",
			},
		],
		related: [
			"image/tim-to-png",
			"document/mcr-to-zip",
			"document/gci-to-json",
		],
	},
};
