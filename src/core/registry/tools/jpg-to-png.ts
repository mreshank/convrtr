import { defineImageConversion } from "./image/defineImageConversion";

export const jpgToPng = defineImageConversion({
	from: { decoder: "jpeg", extraExt: ["jpeg"] },
	to: "png",
	seo: {
		title: "Convert JPG to PNG — free, private, in your browser | convrtr",
		h1: "Convert JPG to PNG",
		intent:
			"Converting JPG to PNG is mainly useful when a downstream tool requires PNG specifically, or when you want a lossless file to keep editing without stacking further JPEG compression on top. It won't remove JPEG's existing compression artefacts or add an alpha channel that wasn't there — PNG just stores the decoded pixels exactly, with no further loss from this step onward.",
		faq: [
			{
				q: "Does converting to PNG fix JPEG compression artefacts?",
				a: "No. Whatever blocking or blurring the original JPEG encoding introduced is already baked into the pixels; PNG just stores those pixels losslessly from this point on.",
			},
			{
				q: "Why would I want PNG instead of a smaller JPEG?",
				a: "Mainly for compatibility with tools that require PNG, or to avoid compounding quality loss if the image will be re-edited and re-saved multiple times.",
			},
		],
		related: ["image/png-to-jpg", "image/jpg-to-webp", "image/jpg-to-avif"],
	},
});
