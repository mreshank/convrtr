import { defineImageConversion } from "./image/defineImageConversion";

export const pngToJpg = defineImageConversion({
	from: { decoder: "png" },
	to: "jpeg",
	seo: {
		title: "Convert PNG to JPG — free, private, in your browser | convrtr",
		h1: "Convert PNG to JPG",
		intent:
			"PNG files — especially screenshots and graphics — are often much larger than they need to be for photos or sharing, and JPEG's lossy compression can shrink them considerably. JPEG has no transparency channel, so any transparent or semi-transparent pixels in the source PNG will be flattened; if your PNG relies on transparency, converting to JPG will change how it looks.",
		faq: [
			{
				q: "What happens to transparent areas?",
				a: "JPEG can't store transparency, so transparent and semi-transparent pixels are flattened into an opaque colour. If transparency matters, keep the file as PNG or convert to WebP instead, which supports alpha.",
			},
			{
				q: "Is this a good idea for screenshots?",
				a: "For screenshots with sharp text and flat colour, JPEG's compression tends to introduce visible artefacts around edges even at high quality — PNG or WebP usually look better for that kind of content. JPEG suits photos best.",
			},
		],
		related: ["image/jpg-to-png", "image/png-to-webp", "image/png-to-avif"],
	},
});
