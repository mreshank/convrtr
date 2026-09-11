import type { Tool } from "../../types";

export const macPaintToPng: Tool = {
	id: "image/macpaint-to-png",
	slug: "macpaint-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-macpaint",
			"image/macpaint",
			"image/x-pntg",
			"application/x-macpaint",
			"application/octet-stream",
		],
		ext: ["mac", "pntg", "macp"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:macpaint-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 576 × 576 Lossless PNG",
				explanation:
					"Decompresses Apple Macintosh PackBits RLE scanlines into authentic 576x576 pixel graphics with crisp monochrome fidelity.",
				params: {},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "transparentBackground",
				label: "Transparent Background (White to Alpha)",
				group: "Background",
				default: false,
			},
			{
				control: "toggle",
				key: "invertColors",
				label: "Invert Monochrome Colors (Negative)",
				group: "Color",
				default: false,
			},
		],
	},
	seo: {
		title:
			"MacPaint to PNG — Convert Apple MacPaint (.mac / .pntg) to PNG | convrtr",
		h1: "Convert Apple MacPaint (.mac / .pntg) to PNG",
		intent:
			"Convert classic 1984 Apple Macintosh MacPaint (.mac, .pntg) graphics into standard 32-bit transparent PNG images directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is a MacPaint file?",
				a: "MacPaint was the pioneering raster graphics editor written by Bill Atkinson for the original 1984 Apple Macintosh 128K. It saves images at a fixed canvas of 576 by 576 monochrome pixels compressed with Atkinson's PackBits run-length encoding (RLE).",
			},
			{
				q: "Why convert MacPaint to PNG?",
				a: "Modern operating systems, image viewers, web browsers, and design software cannot open MacPaint files without specialized vintage emulators. Converting to PNG produces a universal, lossless image viewable everywhere.",
			},
			{
				q: "Does this support transparent backgrounds?",
				a: "Yes. By default, MacPaint converts to black pixels on a solid white canvas. You can toggle the transparent background option to render white pixels as transparent alpha.",
			},
			{
				q: "Are my vintage files uploaded to a server?",
				a: "Never. All PackBits decompression and PNG encoding happen 100% locally in your browser memory using pure TypeScript. Zero files are sent over the network.",
			},
		],
		related: [
			"image/tim-to-png",
			"image/iff-to-png",
			"image/pcx-to-png",
			"image/xbm-to-png",
		],
	},
};

export const macpaintToPng = macPaintToPng;
