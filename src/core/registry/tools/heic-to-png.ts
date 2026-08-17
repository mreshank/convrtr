import { defineImageConversion } from "./image/defineImageConversion";

export const heicToPng = defineImageConversion({
	from: { decoder: "heic" },
	to: "png",
	seo: {
		title: "Convert HEIC to PNG — free, private, in your browser | convrtr",
		h1: "Convert HEIC to PNG",
		intent:
			"PNG is lossless and universally supported, which makes it a safe target when you want a HEIC photo from an iPhone or iPad in a format every image editor and website can read without introducing any further compression loss. The output won't recover detail HEIC already discarded at capture, but nothing extra is lost in this conversion — PNG just repacks the decoded pixels losslessly. Expect a noticeably larger file than the original HEIC or an equivalent JPEG.",
		faq: [
			{
				q: "Is this actually lossless?",
				a: "The PNG step is lossless — the pixels decoded from your HEIC file are stored bit-for-bit, with no further compression loss. It can't undo whatever HEIC's own encoder already did when the photo was taken.",
			},
			{
				q: "Why is the PNG so much bigger than the original HEIC?",
				a: "HEIC uses lossy compression tuned for photos; PNG doesn't compress lossily at all, so a decoded photo re-saved as PNG is typically several times larger.",
			},
			{
				q: "When should I use this instead of HEIC to JPG?",
				a: "Use PNG if you need a lossless intermediate file for further editing. For sharing photos normally, HEIC to JPG produces a much smaller file with no visible quality difference.",
			},
		],
		related: ["image/heic-to-jpg", "image/heic-to-webp", "image/webp-to-png"],
	},
});
