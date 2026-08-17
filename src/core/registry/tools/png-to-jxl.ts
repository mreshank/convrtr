import { defineImageConversion } from "./image/defineImageConversion";

export const pngToJxl = defineImageConversion({
	from: { decoder: "png" },
	to: "jxl",
	seo: {
		title: "Convert PNG to JPEG XL — free, private, in your browser | convrtr",
		h1: "Convert PNG to JPEG XL",
		intent:
			"JPEG XL aims to beat both PNG and JPEG on file size while still supporting transparency and high bit depths. In this tool, PNG to JPEG XL is always a lossy conversion — the WebAssembly encoder's lossless mode doesn't reliably reproduce the source pixels bit-for-bit in our testing, so it isn't offered as a preset — and JPEG XL support in browsers is still inconsistent, so check compatibility with wherever the file is headed before relying on it.",
		faq: [
			{
				q: "Can I get a truly lossless JPEG XL from my PNG?",
				a: "Not with this tool. The JPEG XL encoder we use accepts a 'lossless' flag, but round-tripping it in testing showed small pixel differences rather than a bit-exact result, so every preset here is honestly lossy.",
			},
			{
				q: "Does JPEG XL keep transparency from the PNG?",
				a: "Yes, JPEG XL supports an alpha channel, so transparent areas in the source PNG are preserved.",
			},
		],
		related: ["image/png-to-avif", "image/png-to-webp", "image/jpg-to-jxl"],
	},
});
