import { defineImageResize } from "./image/defineImageResize";

export const resizeWebp = defineImageResize({
	format: "webp",
	ext: "webp",
	mime: { input: ["image/webp"], output: "image/webp" },
	seo: {
		title: "Resize a WebP — free, private, in your browser | convrtr",
		h1: "Resize a WebP",
		intent:
			"Change a WebP's dimensions without uploading it. Resampling uses Lanczos3 rather than canvas bilinear filtering, so downscaled images keep more detail. WebP supports lossless encoding, so the resized result can be stored without any further degradation beyond the resize itself.",
		faq: [
			{
				q: "Can I resize a WebP without losing more quality?",
				a: "Yes, if you keep the lossless preset. The resample itself changes the image — that is what you asked for — but lossless WebP then stores those new pixels exactly, adding no codec degradation on top.",
			},
			{
				q: "Can I set only the width?",
				a: "Yes. Leave the other dimension at 0 and it follows from the original aspect ratio.",
			},
			{
				q: "Does animated WebP work?",
				a: "Not yet. This tool handles still images; animated WebP resizing is on the roadmap.",
			},
		],
		related: ["image/resize-png", "image/webp-to-png", "image/webp-to-jpg"],
	},
});
