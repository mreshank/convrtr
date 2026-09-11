import type { Tool } from "../../types";

export const koaToPng: Tool = {
	id: "image/koa-to-png",
	slug: "koa-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["image/x-koala", "application/x-koala", "application/octet-stream"],
		ext: ["koa", "kla"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:koa-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 320 × 200 Lossless PNG",
				explanation:
					"Decodes the Commodore 64 KoalaPainter 10,003-byte multicolor bitmap into 320 × 200 32-bit RGBA PNG using the authentic VIC-II palette.",
				params: { scale: "1" },
			},
			{
				id: "visually-lossless",
				label: "2x Scaled (640 × 400)",
				explanation:
					"Scales each pixel by 2x nearest-neighbor for crisp, pixel-perfect display on modern high-DPI monitors.",
				params: { scale: "2" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "scale",
				label: "Output Scale",
				group: "Display",
				default: "1",
				options: [
					{ value: "1", label: "1x Native Aspect (320 × 200)" },
					{ value: "2", label: "2x Integer Scale (640 × 400)" },
				],
			},
			{
				control: "select",
				key: "palette",
				label: "VIC-II Color Calibration",
				group: "Color",
				default: "pepto",
				options: [
					{ value: "pepto", label: "Pepto Calibration (Authentic CRT)" },
					{ value: "colodore", label: "Colodore Calibration (S-Video)" },
				],
			},
		],
	},
	seo: {
		title:
			"C64 Koala to PNG — Convert Commodore 64 KoalaPainter (.koa) to PNG | convrtr",
		h1: "Convert Commodore 64 KoalaPainter (.koa) to PNG",
		intent:
			"Convert classic Commodore 64 KoalaPainter multicolor bitmap files (.koa, .kla) into lossless 32-bit RGBA PNG graphics directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is a Commodore 64 KoalaPainter (.koa) file?",
				a: "KoalaPainter (.koa) was released in 1983 by Koala Technologies for the Commodore 64. It became the gold standard graphics format for C64 pixel art and demoscene competitions. Standard files are exactly 10,003 bytes: a 2-byte PRG load address ($6000), 8,000 bytes of bitmap data, 1,000 bytes of Screen RAM, 1,000 bytes of Color RAM, and 1 byte for the background color register.",
			},
			{
				q: "How does VIC-II multicolor mode work?",
				a: "In Commodore 64 multicolor mode, pixels are double-width (2:1 aspect ratio), providing 160 × 200 logical pixels. Each 4x8 character block can display up to 4 simultaneous colors drawn from the C64's 16-color palette: the global background color, two colors from Screen RAM, and one color from Color RAM.",
			},
			{
				q: "Why convert .koa files to PNG?",
				a: "Modern operating systems, graphics software, and web browsers cannot natively display 8-bit Commodore 64 memory dumps. Converting to PNG produces a universal 32-bit RGBA image that preserves the exact retro aesthetic for modern archiving and digital art showcases.",
			},
			{
				q: "Are my retro graphics uploaded to a server?",
				a: "Never. All KoalaPainter bitmap decoding and PNG encoding run 100% locally in your browser using pure TypeScript and WebAssembly. No files ever leave your device.",
			},
		],
		related: [
			"image/zx-to-png",
			"image/iff-to-png",
			"image/pcx-to-png",
			"image/macpaint-to-png",
		],
	},
};
