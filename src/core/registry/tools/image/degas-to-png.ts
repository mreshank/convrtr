import type { Tool } from "../../types";

export const degasToPng: Tool = {
	id: "image/degas-to-png",
	slug: "degas-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["image/x-degas", "application/x-degas", "application/octet-stream"],
		ext: ["pi1", "pi2", "pi3", "pc1", "pc2", "pc3"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:degas-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic Lossless PNG",
				explanation:
					"Decodes Atari ST DEGAS picture bitplanes into authentic 32-bit RGBA PNG with 1:1 pixel rendering and accurate Atari ST 9-bit RGB palette colors.",
				params: { scale: "1" },
			},
			{
				id: "visually-lossless",
				label: "2x Scaled (High DPI)",
				explanation:
					"Scales low-resolution 320 × 200 bitmaps by 2x nearest-neighbor to 640 × 400 for crisp, razor-sharp viewing on modern displays.",
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
					{ value: "1", label: "1x Native Resolution" },
					{ value: "2", label: "2x Integer Scaling" },
				],
			},
		],
	},
	seo: {
		title:
			"Atari ST DEGAS to PNG — Convert DEGAS & DEGAS Elite (.pi1, .pi2, .pi3, .pc1) to PNG | convrtr",
		h1: "Convert Atari ST DEGAS (.pi1, .pi2, .pi3, .pc1) to PNG",
		intent:
			"Convert classic Atari ST DEGAS and DEGAS Elite picture files (.pi1, .pi2, .pi3, .pc1, .pc2, .pc3) into lossless 32-bit RGBA PNG graphics directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is an Atari ST DEGAS (.pi1, .pi2, .pi3) file?",
				a: "DEGAS (Design & Entertainment Graphic Arts System), created by Tom Hudson and published by Batteries Included in 1985, was the preeminent graphics editor for the Atari ST computer line. Standard uncompressed files are 32,034 bytes containing a 2-byte resolution mode header, a 32-byte 16-color palette (Atari ST 9-bit RGB), and 32,000 bytes of interleaved screen bitplanes.",
			},
			{
				q: "What are the differences between .pi1, .pi2, and .pi3 files?",
				a: ".pi1 files are Low Resolution (320 × 200, 16 simultaneous colors from 512). .pi2 files are Medium Resolution (640 × 200, 4 colors, displayed aspect-corrected at 640 × 400). .pi3 files are High Resolution monochrome (640 × 400, 2 colors). Files starting with 'pc' (.pc1, .pc2, .pc3) are DEGAS Elite PackBits RLE compressed versions.",
			},
			{
				q: "Why convert Atari ST DEGAS pictures to PNG?",
				a: "Modern operating systems, image viewers, and web browsers cannot natively decode Atari ST hardware bitplanes or 9-bit color palettes. Converting to PNG produces a universal, lossless 32-bit image ready for sharing on social media, demoscene archives, or personal retrospectives.",
			},
			{
				q: "Are my retro files uploaded to a server?",
				a: "Never. All bitplane reconstruction, PackBits decompression, palette decoding, and PNG generation happen 100% locally inside your browser memory using pure TypeScript. No data ever leaves your device.",
			},
		],
		related: [
			"image/koa-to-png",
			"image/zx-to-png",
			"image/iff-to-png",
			"image/pcx-to-png",
		],
	},
};
