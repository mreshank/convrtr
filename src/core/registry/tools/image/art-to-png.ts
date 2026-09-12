import type { Tool } from "../../types";

export const artToPng: Tool = {
	id: "image/art-to-png",
	slug: "art-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-c64-art",
			"image/x-artstudio",
			"application/x-artstudio",
			"application/octet-stream",
		],
		ext: ["art"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:art-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-Bit RGBA PNG",
				explanation:
					"Decodes Commodore 64 Advanced Art Studio Hires and Multicolor bitmap graphics into crystal-clear 32-bit RGBA PNG with authentic VIC-II palettes.",
				params: { scale: 1, palette: "pepto" },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "scale",
				label: "Pixel Scale Multiplier",
				group: "Output",
				min: 1,
				max: 8,
				step: 1,
				default: 1,
			},
			{
				control: "select",
				key: "palette",
				label: "C64 Color Palette",
				group: "Color",
				default: "pepto",
				options: [
					{ label: "Pepto (Authentic CRT)", value: "pepto" },
					{ label: "Colodore (Calibrated D65)", value: "colodore" },
				],
			},
		],
	},
	seo: {
		title:
			"ART to PNG — Convert C64 Advanced Art Studio (.art) to PNG Online | convrtr",
		h1: "Convert C64 Advanced Art Studio (.art) to PNG",
		intent:
			"Convert vintage Commodore 64 Advanced Art Studio (.art) Hires and Multicolor bitmap images into pixel-perfect 32-bit RGBA PNG graphics directly in your browser. 100% private client-side C64 VIC-II decoding with zero server uploads.",
		faq: [
			{
				q: "What is a Commodore 64 Advanced Art Studio (.art) file?",
				a: "Advanced Art Studio (.art) was released in 1986 by Oxford Computer Systems as an advanced graphic design suite for the Commodore 64. It supported both 320x200 2-color Hires mode and 160x200 4-color Multicolor mode with custom palettes, pattern fills, and magnifying editors.",
			},
			{
				q: "Why convert C64 Art Studio pictures to PNG?",
				a: "Modern image viewers and mobile devices cannot render Commodore 64 VIC-II bitplane memory dumps. Converting to PNG preserves the original pixel art and retro color palette in a universal, lossless format readable on modern screens.",
			},
			{
				q: "How does the in-browser C64 decoder work?",
				a: "The engine parses the 2-byte PRG load address, analyzes the memory structure to distinguish between Hires (8,000 bytes bitmap + 1,000 bytes screen RAM) and Multicolor modes, maps the authentic 16-color Commodore 64 palette, and renders pixel-accurate 32-bit RGBA PNG rasters.",
			},
			{
				q: "Are my retro image files uploaded to any server?",
				a: "Never. All bitplane unpacking, color mapping, and PNG encoding execute 100% locally in your web browser via client-side TypeScript. No data ever leaves your computer.",
			},
		],
		related: [
			"image/koa-to-png",
			"image/neo-to-png",
			"image/degas-to-png",
			"image/zx-to-png",
			"image/macpaint-to-png",
		],
	},
};
