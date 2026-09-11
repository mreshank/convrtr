import type { Tool } from "../../types";

export const tgsToJson: Tool = {
	id: "image/tgs-to-json",
	slug: "tgs-to-json",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/gzip", "application/octet-stream"],
		ext: ["tgs"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:tgs-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Decompresses the GZIP envelope to produce the bit-exact Lottie JSON animation data.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"TGS to JSON — Convert Telegram Animated Stickers to Lottie | convrtr",
		h1: "Convert Telegram .tgs Stickers to Lottie JSON",
		intent:
			"Convert Telegram animated sticker (.tgs) files directly to standard Lottie JSON animations. Open, edit, and use Telegram vector animations in Figma, Adobe After Effects, Discord, or on the web. 100% client-side, zero uploads.",
		faq: [
			{
				q: "What is a .tgs file?",
				a: "A .tgs file is an animated vector sticker used by Telegram. Under the hood, it is a standard Lottie animation file compressed using GZIP to reduce network payload sizes.",
			},
			{
				q: "Can I import the resulting JSON into After Effects or Figma?",
				a: "Yes! The exported file is standard Bodymovin / Lottie JSON, compatible with the official LottieFiles plugin for After Effects, Figma, Canva, and web players.",
			},
			{
				q: "Is any animation quality lost during conversion?",
				a: "No. GZIP is a lossless compression format. Decompressing the file restores the original JSON character-for-character without any changes to vectors, timing, or colors.",
			},
			{
				q: "Does this require an internet connection?",
				a: "No. All decompression takes place in your local browser runtime. Your sticker files never leave your computer or phone.",
			},
		],
		related: [],
	},
};
