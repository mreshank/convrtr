import { defineImageConversion } from "./image/defineImageConversion";

export const webpToPng = defineImageConversion({
	from: { decoder: "webp" },
	to: "png",
	seo: {
		title: "Convert WebP to PNG — free, private, in your browser | convrtr",
		h1: "Convert WebP to PNG",
		intent:
			"Some older software, email clients, and design tools still don't accept WebP, so converting to PNG is the usual fix. If the source WebP was saved lossily, converting to PNG can't recover the detail already lost — it only guarantees no further loss from this step onward — and if the source was saved lossless, the PNG will reproduce it exactly.",
		faq: [
			{
				q: "Will this restore quality lost in a lossy WebP?",
				a: "No. Whatever compression the original WebP encoder applied is already baked into the decoded pixels; PNG just stores those pixels losslessly, without adding more loss.",
			},
			{
				q: "Why would I need PNG instead of WebP?",
				a: "Mostly compatibility — some image editors, older browsers, and document or email tools either don't support WebP or handle it inconsistently, while PNG is universally supported.",
			},
		],
		related: ["image/png-to-webp", "image/webp-to-jpg"],
	},
});
