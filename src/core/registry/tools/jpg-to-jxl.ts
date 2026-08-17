import { defineImageConversion } from "./image/defineImageConversion";

export const jpgToJxl = defineImageConversion({
	from: { decoder: "jpeg", extraExt: ["jpeg"] },
	to: "jxl",
	seo: {
		title: "Convert JPG to JPEG XL — free, private, in your browser | convrtr",
		h1: "Convert JPG to JPEG XL",
		intent:
			"JPEG XL (.jxl) is a royalty-free image format designed to beat both JPEG and WebP on compression at the same visual quality, with support for higher bit depths and progressive decoding. Some encoders can losslessly repack an existing JPEG's compressed data straight into a JPEG XL container — this tool doesn't do that; it fully decodes your JPEG to pixels and re-encodes them, and browser support for JPEG XL is currently inconsistent, so check where the file is headed before relying on it.",
		faq: [
			{
				q: "Is this a lossless JPEG-to-JXL repack?",
				a: "No. That's a distinct feature — transcoding the original JPEG bytes without a decode — that the WebAssembly codec this tool uses doesn't expose. This conversion decodes the JPEG to pixels and re-encodes them as JPEG XL at your chosen quality.",
			},
			{
				q: "Will my browser open a .jxl file?",
				a: "Support is inconsistent: Safari 17+ supports JPEG XL, Chrome removed default support in 2023, and Firefox needs a flag. Confirm your target audience or software can open it before switching to JXL for delivery.",
			},
		],
		related: ["image/jpg-to-avif", "image/jpg-to-webp"],
	},
});
