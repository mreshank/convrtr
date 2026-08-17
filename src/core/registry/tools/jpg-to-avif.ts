import { defineImageConversion } from "./image/defineImageConversion";

export const jpgToAvif = defineImageConversion({
	from: { decoder: "jpeg", extraExt: ["jpeg"] },
	to: "avif",
	seo: {
		title: "Convert JPG to AVIF — free, private, in your browser | convrtr",
		h1: "Convert JPG to AVIF",
		intent:
			"AVIF is a newer image format based on the AV1 video codec's intra-frame coding, and it typically produces smaller files than JPEG at a similar visual quality. It's supported in current versions of Chrome, Firefox, and Safari. This tool always encodes AVIF lossily — true AVIF lossless mode exists in the underlying codec, but it tends to produce files larger than the source, so it isn't offered as a preset here.",
		faq: [
			{
				q: "How much smaller is AVIF than JPEG?",
				a: "It varies by image, but 20-50% smaller at matching visual quality is a common range, especially at the balanced and smallest presets.",
			},
			{
				q: "Is AVIF lossless?",
				a: "Not in this tool. AVIF does have a lossless mode, but it's impractical for typical photos — files often end up larger than a well-compressed lossy AVIF or even the original JPEG — so every preset here is lossy.",
			},
			{
				q: "Will everyone be able to open the AVIF file I make?",
				a: "Modern browsers, yes. Some older software, image viewers, and editing tools still don't support AVIF, so keep the original if you need broad compatibility.",
			},
		],
		related: ["image/jpg-to-webp", "image/jpg-to-jxl", "image/avif-to-jpg"],
	},
});
