import type { Tool } from "../../types";

export const gbrToPng: Tool = {
	id: "image/gbr-to-png",
	slug: "gbr-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-gimp-brush",
			"application/x-gimp-brush",
			"image/gbr",
			"application/octet-stream",
		],
		ext: ["gbr"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:gbr-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Transparent PNG Brush Stamp",
				explanation:
					"Converts GIMP Brush (.gbr) files into crisp, transparent PNG stamps. Converts grayscale opacity masks into transparent alpha stamps or extracts full RGBA color channels, ready for Photoshop, Procreate, Krita, and Clip Studio Paint.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"GBR to PNG — Convert GIMP Brush (.gbr) to Transparent PNG | convrtr",
		h1: "Convert GIMP Brush (.gbr) to Transparent PNG",
		intent:
			"Convert GIMP (.gbr) brush tip files into clean transparent PNG images directly in your browser. Import GIMP brushes into Photoshop, Procreate, Clip Studio Paint, or Krita with zero server uploads.",
		faq: [
			{
				q: "What is a .gbr file?",
				a: "A .gbr file is the native brush format for GIMP (GNU Image Manipulation Program). It contains raster pixel data—either a single-channel grayscale opacity mask or a 4-channel RGBA color brush—along with dimensions, spacing, and the brush name.",
			},
			{
				q: "How does convrtr convert GIMP grayscale brushes to PNG?",
				a: "In GIMP grayscale brushes, black pixels (0) represent opaque paint and white pixels (255) represent transparent paper. convrtr reverses this opacity gradient into an alpha channel with black ink, producing a transparent PNG stamp that can be directly imported as a brush tip into Photoshop, Procreate, Clip Studio Paint, or Krita.",
			},
			{
				q: "Can I convert color GIMP brushes?",
				a: "Yes! If a .gbr file was saved as a full-color brush (4 bytes per pixel RGBA), convrtr preserves all original colors and alpha values bit-for-bit in the resulting PNG.",
			},
			{
				q: "Do I need GIMP installed to use this tool?",
				a: "No! All binary parsing and PNG encoding are performed 100% locally inside your web browser using pure TypeScript and WebAssembly. No desktop software or external tools are required.",
			},
			{
				q: "Are my brush files uploaded to any server?",
				a: "Never. All processing takes place entirely within your browser's local memory. None of your files or creative assets are transmitted across the network.",
			},
		],
		related: [
			"image/abr-to-png",
			"image/clip-to-png",
			"image/procreate-to-png",
		],
	},
};
