import { defineImageConversion } from "./image/defineImageConversion";

export const avifToJpg = defineImageConversion({
	from: { decoder: "avif" },
	to: "jpeg",
	seo: {
		title: "Convert AVIF to JPG — free, private, in your browser | convrtr",
		h1: "Convert AVIF to JPG",
		intent:
			"AVIF isn't supported by every browser, image viewer, or editing tool yet, so converting to JPEG is the practical fallback when you need a file that just about anything can open. The conversion decodes the AVIF and re-encodes it as JPEG at your chosen quality; any transparency in the AVIF is discarded, since JPEG has no alpha channel.",
		faq: [
			{
				q: "Why would I need to convert away from AVIF?",
				a: "Plenty of software — older browsers, some photo editors, printers, and upload forms — still doesn't recognise AVIF. JPEG is the most broadly compatible fallback.",
			},
			{
				q: "Does this keep AVIF's transparency?",
				a: "No. JPEG has no alpha channel, so any transparent areas in the source AVIF are flattened to an opaque colour.",
			},
		],
		related: ["image/jpg-to-avif", "image/avif-to-png"],
	},
});
