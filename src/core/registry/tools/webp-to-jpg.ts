import { defineImageConversion } from "./image/defineImageConversion";

export const webpToJpg = defineImageConversion({
	from: { decoder: "webp" },
	to: "jpeg",
	seo: {
		title: "Convert WebP to JPG — free, private, in your browser | convrtr",
		h1: "Convert WebP to JPG",
		intent:
			"JPEG remains the safest format for maximum compatibility — every image viewer, printer, and decade-old piece of software can open it, which WebP can't always guarantee. Converting drops any transparency the WebP might have had, since JPEG has no alpha channel, and re-compresses the image, so pick a high-quality preset if the source was already lossy to avoid stacking visible additional artefacts.",
		faq: [
			{
				q: "What happens if my WebP has transparency?",
				a: "JPEG has no transparency support, so transparent or semi-transparent pixels get flattened to an opaque colour. If you need to keep transparency, convert to PNG instead.",
			},
			{
				q: "Why convert to JPEG instead of keeping WebP?",
				a: "Mainly compatibility — older editing tools, some printers, and certain upload forms still don't accept WebP. JPEG is understood almost everywhere.",
			},
		],
		related: ["image/jpg-to-webp", "image/webp-to-png"],
	},
});
