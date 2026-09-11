import type { Tool } from "../../types";

export const abrToPng: Tool = {
	id: "image/abr-to-png",
	slug: "abr-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-photoshop-brush",
			"image/x-photoshop-brush",
			"application/octet-stream",
		],
		ext: ["abr"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:abr-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless Stamps",
				explanation:
					"Extracts bit-exact brush tip bitmaps and synthesizes transparent PNG stamps with full alpha channel dynamics.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"ABR to PNG — Extract Photoshop Brushes as Transparent PNGs | convrtr",
		h1: "Extract Transparent PNG Stamps from Photoshop Brushes (.abr)",
		intent:
			"Extract all brush tip stamps from Adobe Photoshop (.abr) brush libraries into individual transparent PNG images and a detailed manifest. Import free Photoshop brushes directly into Procreate, Krita, Clip Studio Paint, or Figma with zero server uploads.",
		faq: [
			{
				q: "What does this tool extract from an .abr file?",
				a: "This tool parses the internal 8BIM 'samp' blocks and legacy brush definitions inside .abr files, decompresses the PackBits grayscale alpha channels, and synthesizes full-resolution transparent PNG stamps for every brush in the pack bundled into a convenient .zip archive with a BRUSH_MANIFEST.md report.",
			},
			{
				q: "Can I import these extracted PNGs into Procreate, Krita, or Clip Studio Paint?",
				a: "Yes! Modern digital art apps support creating custom brushes from PNG shape sources. In Procreate, create a new brush and import the extracted PNG into 'Shape Source'. In Krita, add it under 'Predefined Brush'. In Clip Studio Paint, register the image as a material brush tip.",
			},
			{
				q: "Does this require Adobe Photoshop or Creative Cloud?",
				a: "No! You do not need Photoshop installed or an active Adobe subscription. All parsing, decompression, and PNG generation happens 100% locally in your web browser.",
			},
			{
				q: "Are my brush files uploaded to any server?",
				a: "Never. Everything runs completely client-side in your device's memory with zero server uploads. Your brush packs and artworks remain 100% private.",
			},
		],
		related: ["image/procreate-to-png", "image/clip-to-png"],
	},
};
