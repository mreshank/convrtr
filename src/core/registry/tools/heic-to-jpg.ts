import { defineImageConversion } from "./image/defineImageConversion";

export const heicToJpg = defineImageConversion({
	from: { decoder: "heic" },
	to: "jpeg",
	seo: {
		title: "Convert HEIC to JPG — free, private, in your browser | convrtr",
		h1: "Convert HEIC to JPG",
		intent:
			"HEIC (High Efficiency Image Container) is what iPhones and iPads have saved photos as by default since iOS 11. It compresses better than JPEG, but Windows, many web forms, and a lot of older or non-Apple software still can't open it. Converting to JPG gets you a file almost everything can read, at the cost of HEIC's smaller size. The conversion runs entirely in your browser — the photo is decoded and re-encoded locally, never uploaded.",
		faq: [
			{
				q: "Why can't I open HEIC photos on my Windows PC?",
				a: "Windows Explorer needs Apple's HEIF codec extension to preview HEIC files, and it isn't installed by default. Many apps and upload forms don't support HEIC at all, which is why converting to JPG is the common workaround.",
			},
			{
				q: "Will converting to JPG lose quality?",
				a: "Yes — JPEG has no lossless mode, so re-encoding always re-quantises the image. At the visually-lossless preset (quality 92) the difference isn't visible in normal viewing; at lower presets it shows up as blocking and colour banding.",
			},
			{
				q: "Does this upload my photos anywhere?",
				a: "No. Both the HEIC decode and the JPEG encode happen inside your browser via WebAssembly — nothing leaves your device.",
			},
		],
		related: ["image/heic-to-png", "image/heic-to-webp", "image/png-to-jpg"],
	},
});
