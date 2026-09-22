import type { Tool } from "../../types";

export const psdToPng: Tool = {
	id: "image/psd-to-png",
	slug: "psd-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/vnd.adobe.photoshop",
			"image/x-photoshop",
			"application/octet-stream",
		],
		ext: ["psd"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:psd-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Flattened Composite",
				explanation:
					"Reads layers (or the embedded composite) and flattens to 32-bit RGBA PNG with normal blending and opacity. Pixel data transfers exactly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "PSD to PNG — Open Photoshop Files Without Photoshop | convrtr",
		h1: "Convert PSD to PNG",
		intent:
			"View and extract any Photoshop (.psd) file as a full-resolution PNG with no Adobe subscription — layers flattened in your browser with normal blending and transparency intact. CMYK, Lab and 16-bit files are refused with specific errors instead of wrong colours. Nothing uploaded.",
		faq: [
			{
				q: "A designer sent a .psd and I have no Photoshop. What do I get?",
				a: "The flattened artwork at full canvas resolution with transparency — enough to review, present, attach to tickets or hand to developers. Layer editability needs Photoshop itself.",
			},
			{
				q: "How are layers, masks and blend modes handled?",
				a: "Layers composite bottom-up with opacity; exotic blend modes, clipping masks and adjustment layers flatten as normal — the same simplification every lightweight reader makes, stated openly.",
			},
			{
				q: "Why was my file refused?",
				a: "Only 8-bit gray/indexed/RGB with raw or RLE data are supported. CMYK, Lab, 16/32-bit and ZIP-compressed files fail with a message naming the exact blocker and the re-save that fixes it.",
			},
			{
				q: "Is my client's design uploaded anywhere?",
				a: "No. Parsing, compositing and PNG encoding run entirely inside your browser.",
			},
		],
		related: ["image/kra-to-png", "image/ora-to-png", "image/cdr-to-png"],
	},
};
