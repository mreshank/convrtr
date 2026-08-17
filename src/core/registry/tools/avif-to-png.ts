import { defineImageConversion } from "./image/defineImageConversion";

export const avifToPng = defineImageConversion({
	from: { decoder: "avif" },
	to: "png",
	seo: {
		title: "Convert AVIF to PNG — free, private, in your browser | convrtr",
		h1: "Convert AVIF to PNG",
		intent:
			"PNG is the safest lossless fallback when a piece of software can't open AVIF yet — image editors, older operating systems, and some upload tools among them. This conversion preserves AVIF's alpha channel, unlike a JPEG target, and adds no further compression loss beyond whatever the AVIF encoder already applied, at the cost of a noticeably larger file.",
		faq: [
			{
				q: "Does converting to PNG restore quality a lossy AVIF lost?",
				a: "No — whatever the AVIF encoder discarded is already gone. PNG just stores the decoded pixels exactly, without losing anything further.",
			},
			{
				q: "Does this keep transparency from the AVIF?",
				a: "Yes. PNG supports an alpha channel, so transparent areas in the source AVIF carry through.",
			},
		],
		related: ["image/avif-to-jpg", "image/png-to-avif"],
	},
});
