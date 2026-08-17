import { defineImageConversion } from "./image/defineImageConversion";

export const jpgToWebp = defineImageConversion({
	from: { decoder: "jpeg", extraExt: ["jpeg"] },
	to: "webp",
	seo: {
		title: "Convert JPG to WebP — free, private, in your browser | convrtr",
		h1: "Convert JPG to WebP",
		intent:
			"WebP typically produces smaller files than JPEG at a comparable visual quality, which is why it's a common target when optimising images for the web. Converting an existing JPEG can't restore detail the original JPEG encoder already discarded — this tool decodes your JPEG and re-encodes it as WebP, so 'lossless' here means no further loss is added on top of whatever the JPEG already lost, not a full recovery of the pre-JPEG original.",
		faq: [
			{
				q: "Will this make my JPEG look better?",
				a: "No — it can only preserve or reduce quality from here, never restore what the original JPEG encoding already lost. If you have the uncompressed source, convert from that instead.",
			},
			{
				q: "What's the difference between the lossless and lossy presets?",
				a: "Lossless WebP keeps the decoded JPEG's pixels exactly; the lossy presets re-compress them further for a smaller file, trading some additional — usually invisible at the higher presets — quality for size.",
			},
		],
		related: ["image/webp-to-jpg", "image/jpg-to-png", "image/jpg-to-avif"],
	},
});
