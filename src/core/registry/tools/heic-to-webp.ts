import { defineImageConversion } from "./image/defineImageConversion";

export const heicToWebp = defineImageConversion({
	from: { decoder: "heic" },
	to: "webp",
	seo: {
		title: "Convert HEIC to WebP — free, private, in your browser | convrtr",
		h1: "Convert HEIC to WebP",
		intent:
			"WebP gives you a smaller file than PNG while still supporting transparency and broad browser support that JPEG lacks, which makes it a good target for publishing iPhone photos on the web. This tool can produce either a lossless WebP (no further pixel loss beyond what HEIC already baked in) or a lossy one at a chosen quality, depending on the preset you pick.",
		faq: [
			{
				q: "Should I pick lossless or lossy WebP?",
				a: "Lossless keeps every pixel HEIC handed over, at a larger file size. For photos, the visually-lossless or balanced lossy presets are usually smaller with no noticeable difference — lossless matters more for graphics and screenshots than camera photos.",
			},
			{
				q: "Is WebP supported everywhere?",
				a: "All current major browsers support WebP. Some older software and a handful of image editors still don't, which is the main reason to prefer JPEG or PNG for maximum compatibility.",
			},
		],
		related: ["image/heic-to-jpg", "image/heic-to-png", "image/png-to-webp"],
	},
});
