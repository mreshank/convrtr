import type { Tool } from "../../types";

export const vdaToPng: Tool = {
	id: "image/vda-to-png",
	slug: "vda-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-vda",
			"image/vda",
			"image/x-targa",
			"application/x-vda",
			"application/octet-stream",
		],
		ext: ["vda", "icb", "vst"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:vda-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-Bit RGBA PNG",
				explanation:
					"Decodes Truevision Video Display Adapter (VDA), Image Capture Board (ICB), and Video Solid State (VST) TARGA rasters into standard transparent PNG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VDA to PNG — Convert Truevision VDA / ICB / VST to PNG Online | convrtr",
		h1: "Convert Truevision VDA to PNG",
		intent:
			"Decode and convert Truevision VDA, ICB, and VST TARGA image files into transparent 32-bit RGBA PNG images directly in your browser. 100% private client-side raster conversion with zero server uploads.",
		faq: [
			{
				q: "What is a Truevision VDA / ICB / VST file?",
				a: "VDA (Video Display Adapter), ICB (Image Capture Board), and VST (Video Solid State) are original raster image formats created by Truevision in 1984 alongside TARGA (TGA). They share the identical 18-byte Truevision header specification, supporting 8-bit paletted, 16-bit, 24-bit RGB, and 32-bit RGBA pixels with optional run-length encoding.",
			},
			{
				q: "Why do modern image viewers fail to open .vda or .icb files?",
				a: "Modern operating systems and image software typically associate only the .tga extension with the Truevision parser, failing to recognize .vda, .icb, or .vst files despite identical underlying pixel data. convrtr transparently inspects the Truevision header and renders standard PNG images.",
			},
			{
				q: "Are my graphics files uploaded to an external server?",
				a: "Never. All Truevision header parsing, RLE decompression, color-space mapping, and PNG encoding occur strictly within your local browser sandbox.",
			},
		],
		related: [
			"image/tga-to-png",
			"image/pcx-to-png",
			"image/dds-to-png",
			"image/vtf-to-png",
			"image/qoi-to-png",
		],
	},
};
