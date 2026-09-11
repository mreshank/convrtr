import type { Tool } from "../../types";

export const tgaToPng: Tool = {
	id: "image/tga-to-png",
	slug: "tga-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-tga",
			"image/tga",
			"image/x-targa",
			"application/x-tga",
			"application/octet-stream",
		],
		ext: ["tga", "icb", "vda", "vst"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:tga-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Graphic",
				explanation:
					"Decodes Truevision TGA (.tga) bitmap files into standard PNG images. Supports uncompressed & RLE compressed truecolor (24/32-bit), color-mapped palettes, and grayscale textures, adjusting vertical scanline orientation seamlessly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"TGA to PNG — Convert Truevision TGA Images to Lossless PNG | convrtr",
		h1: "Convert Truevision TGA to Lossless PNG",
		intent:
			"Convert Truevision TGA (.tga) game textures, sprites, and 3D rendering outputs into standard PNG images right in your browser. Preserves transparency and full RGBA color channels with zero server uploads.",
		faq: [
			{
				q: "What is a .tga (TARGA) file?",
				a: "A .tga (Truevision Advanced Raster Graphics Adapter) file is a raster graphics file format created by Truevision Inc. Widely used in 3D game engines (such as Source, Unreal, and id Tech), animation, and texture rendering, it supports 8-bit grayscale, 15/16/24-bit truecolor, and 32-bit truecolor with an alpha transparency channel.",
			},
			{
				q: "Does this converter support compressed and uncompressed TGA files?",
				a: "Yes! convrtr supports both uncompressed TGA formats (image types 1, 2, 3) and Run-Length Encoded (RLE) compressed TGA formats (image types 9, 10, 11).",
			},
			{
				q: "Why do some TGA files open upside-down in other tools?",
				a: "Classic TGA specification places the image origin at the lower-left corner (bottom-up scanline order), whereas modern image viewers expect top-to-bottom order. convrtr reads the image descriptor byte and normalizes the scanline orientation so your PNG is oriented properly.",
			},
			{
				q: "Is transparency preserved when converting TGA to PNG?",
				a: "Yes! If your TGA file has a 32-bit RGBA depth or an embedded alpha channel, convrtr retains transparency in the resulting PNG.",
			},
			{
				q: "Are my texture files uploaded to a remote server?",
				a: "Never. All decoding and PNG compression occur 100% locally in your browser's memory using pure TypeScript and WebAssembly. No data ever leaves your computer.",
			},
		],
		related: ["image/dds-to-png", "image/icns-to-png", "image/cur-to-png"],
	},
};
