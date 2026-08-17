import { defineImageConversion } from "./image/defineImageConversion";

export const pngToAvif = defineImageConversion({
	from: { decoder: "png" },
	to: "avif",
	seo: {
		title: "Convert PNG to AVIF — free, private, in your browser | convrtr",
		h1: "Convert PNG to AVIF",
		intent:
			"AVIF can shrink a PNG far more than JPEG can, especially for photographic content, because it uses the AV1 video codec's intra-frame compression instead of PNG's lossless DEFLATE. This tool always encodes AVIF lossily — the codec's lossless mode is impractical for real images, so it isn't exposed as a preset here — and unlike JPEG, AVIF does support transparency, so alpha in the source PNG is preserved.",
		faq: [
			{
				q: "Does AVIF keep PNG's transparency?",
				a: "Yes, AVIF supports an alpha channel, unlike JPEG. Transparent areas in the source PNG carry through.",
			},
			{
				q: "Why not just keep the file as PNG?",
				a: "PNG's lossless compression can't compete with AVIF's lossy compression on file size, especially for photographic or gradient-heavy images. If a large PNG's size is the problem and some quality loss is acceptable, AVIF is usually a big win.",
			},
		],
		related: ["image/png-to-webp", "image/png-to-jpg", "image/png-to-jxl"],
	},
});
