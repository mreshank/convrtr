import type { Tool } from "../../types";

export const pcxToPng: Tool = {
	id: "image/pcx-to-png",
	slug: "pcx-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-pcx",
			"image/pcx",
			"application/x-pcx",
			"application/octet-stream",
		],
		ext: ["pcx", "pcc"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:pcx-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Image",
				explanation:
					"Decodes vintage ZSoft PCX bitmap images into clean, modern 32-bit RGBA PNG files. Supports 1-bit monochrome, 4-bit EGA, 8-bit paletted with 256-color trailing palette, and 24-bit TrueColor planar RGB images.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"PCX to PNG — Convert ZSoft PCX Retro Images to Lossless PNG | convrtr",
		h1: "Convert ZSoft PCX to Lossless PNG",
		intent:
			"Convert vintage DOS and early Windows ZSoft PCX (.pcx) bitmap textures, sprites, and scanned documents into standard PNG images directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a .pcx file?",
				a: "PCX (Personal Computer eXchange) was one of the earliest raster graphics formats developed by ZSoft Corporation for PC Paintbrush on MS-DOS. It became an industry standard in early PC gaming (Doom, Duke Nukem, Apogee classics) and desktop publishing.",
			},
			{
				q: "Does this converter support both 8-bit and 24-bit PCX files?",
				a: "Yes! convrtr supports 1-bit monochrome, 4-bit EGA 16-color palettes, 8-bit indexed images with trailing 256-color palettes, and 24-bit TrueColor images across 3 separate scanline planes.",
			},
			{
				q: "Can modern browsers open PCX files without conversion?",
				a: "No. Modern web browsers, macOS Preview, and smartphone operating systems have dropped native support for PCX. Converting to PNG allows universal viewing, editing, and sharing.",
			},
			{
				q: "Are my retro image files uploaded to any server?",
				a: "Never. All RLE decompression, palette mapping, and PNG encoding run entirely inside your browser memory with zero network requests.",
			},
		],
		related: ["image/tga-to-png", "image/dds-to-png"],
	},
};
