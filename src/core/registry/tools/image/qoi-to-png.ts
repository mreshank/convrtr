import type { Tool } from "../../types";

export const qoiToPng: Tool = {
	id: "image/qoi-to-png",
	slug: "qoi-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/qoi",
			"image/x-qoi",
			"application/x-qoi",
			"application/octet-stream",
		],
		ext: ["qoi"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:qoi-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-Bit RGBA PNG",
				explanation:
					"Decompresses Quite OK Image (QOI) pixel streams into standard 32-bit lossless PNG with full alpha channel and colorspace fidelity.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "QOI to PNG — Convert Quite OK Image (.qoi) to PNG Online | convrtr",
		h1: "Convert Quite OK Image (.qoi) to PNG",
		intent:
			"Convert Dominic Szablewski's Quite OK Image (.qoi) files into standard lossless 32-bit RGBA PNG images directly in your browser. 100% private client-side decompression with zero server uploads.",
		faq: [
			{
				q: "What is a QOI (.qoi) file?",
				a: "QOI (Quite OK Image format) is a fast, lossless image compression format created by Dominic Szablewski in 2021. Designed as an elegant, simpler alternative to PNG, it compresses RGB and RGBA images to comparable file sizes while encoding and decoding up to 20-50x faster.",
			},
			{
				q: "Why convert QOI images to PNG?",
				a: "While QOI is increasingly popular in indie game development, embedded systems, and graphics engines, most standard web browsers, photo viewers, and operating systems do not natively render .qoi files. Converting to standard PNG ensures universal compatibility across all devices and software.",
			},
			{
				q: "Does QOI to PNG conversion lose image quality?",
				a: "Not a single bit. Both QOI and PNG are 100% lossless image formats. Every pixel, color value, and alpha transparency channel in the original image is preserved with bit-exact mathematical fidelity.",
			},
			{
				q: "Are my images uploaded to any cloud server?",
				a: "Never. All QOI chunk decoding and PNG encoding execute entirely client-side inside your browser's local memory using pure TypeScript. Your private graphics, renders, and game assets are never transmitted across the network.",
			},
		],
		related: [
			"image/dds-to-png",
			"image/tga-to-png",
			"image/pcx-to-png",
			"image/ppm-to-png",
		],
	},
};
