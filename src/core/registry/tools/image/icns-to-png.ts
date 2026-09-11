import type { Tool } from "../../types";

export const icnsToPng: Tool = {
	id: "image/icns-to-png",
	slug: "icns-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["image/x-icns", "image/icns", "application/octet-stream"],
		ext: ["icns"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:icns-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Highest Retina PNG",
				explanation:
					"Extracts the maximum resolution (up to 1024x1024 Retina 512@2x) PNG icon directly from the Apple ICNS container with full alpha channel.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "ICNS to PNG — Extract Mac App Icons to PNG Online Free | convrtr",
		h1: "Convert Apple ICNS to PNG",
		intent:
			"Convert Apple macOS icon files (.icns) into high-resolution PNG images directly in your browser. Extract 1024x1024 Retina application icons on Windows, Linux, or Android without a Mac, with 100% private client-side processing.",
		faq: [
			{
				q: "How do I open an Apple .icns file on Windows or Linux?",
				a: "Windows and Linux do not natively support macOS .icns icon files. This tool parses the ICNS chunk structure, identifies the embedded PNG image streams, and extracts the highest-resolution asset as a standard transparent PNG file.",
			},
			{
				q: "Does this preserve transparency and full retina resolution?",
				a: "Yes. Modern Apple .icns files embed full 32-bit RGBA PNG streams up to 1024x1024 pixels. This tool extracts the exact raw PNG bytes with pristine alpha transparency without re-encoding or downscaling.",
			},
			{
				q: "Can I use these extracted icons in Windows or web projects?",
				a: "Yes. The extracted PNG file is a standard web-ready PNG image that can be opened in Photoshop, Figma, GIMP, used as a web favicon, or converted into a Windows .ico file.",
			},
			{
				q: "Are my icon files uploaded to any server?",
				a: "No. The entire extraction runs 100% on your device inside your web browser. Your proprietary app branding and unreleased icons are never uploaded.",
			},
		],
		related: ["image/procreate-to-png", "image/clip-to-png"],
	},
};
