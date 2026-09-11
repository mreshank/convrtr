import type { Tool } from "../../types";

export const asepriteToPng: Tool = {
	id: "image/aseprite-to-png",
	slug: "aseprite-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-aseprite",
			"application/x-aseprite",
			"application/octet-stream",
		],
		ext: ["aseprite", "ase"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:aseprite-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Sprite",
				explanation:
					"Decodes Aseprite (.aseprite / .ase) pixel art sprites, layers, cels, and color palettes into lossless 32-bit RGBA PNG files with transparency.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Aseprite to PNG — Convert Aseprite (.aseprite/.ase) Pixel Art to Lossless PNG | convrtr",
		h1: "Convert Aseprite Pixel Art to Lossless PNG",
		intent:
			"Convert Aseprite and ASE pixel art files, game sprites, character animations, and tilemaps into high-resolution PNG images directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an Aseprite (.aseprite / .ase) file?",
				a: "Aseprite is the industry-standard pixel art editing and 2D animation tool. Its native binary format (.aseprite and legacy .ase) stores layered animation frames, zlib-compressed cels, user palettes, and slice metadata.",
			},
			{
				q: "Can I view Aseprite files without installing Aseprite?",
				a: "Yes! convrtr unpacks the binary cel chunks and renders the composite image into standard PNG directly in your browser without requiring the Aseprite software or command-line CLI.",
			},
			{
				q: "Does this converter support indexed, grayscale, and RGBA color modes?",
				a: "Yes. convrtr supports 8-bit indexed palettes with transparent indices, 16-bit grayscale with alpha, and 32-bit TrueColor RGBA cels.",
			},
			{
				q: "Are my pixel art assets uploaded to any server?",
				a: "Never. All cel decompression, layer compositing, and PNG encoding run entirely inside your browser memory with zero network requests.",
			},
		],
		related: ["image/pcx-to-png", "image/iff-to-png", "image/tga-to-png"],
	},
};
