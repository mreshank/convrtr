import type { Tool } from "../../types";

export const icoToPng: Tool = {
	id: "image/ico-to-png",
	slug: "ico-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-icon",
			"image/vnd.microsoft.icon",
			"image/ico",
			"application/ico",
			"application/x-ico",
		],
		ext: ["ico"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:ico-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Highest-Resolution Frame (Lossless PNG)",
				explanation:
					"Scans the icon directory, identifies all embedded resolutions (up to 256x256), and extracts the highest-fidelity 32-bit RGBA frame with full transparency.",
				params: {},
			},
		],
		advanced: [
			{
				control: "select",
				key: "preferredSize",
				label: "Target Icon Size",
				group: "Extraction",
				default: "0",
				options: [
					{ value: "0", label: "Automatic (Largest Available)" },
					{ value: "256", label: "256 × 256 (High-DPI)" },
					{ value: "128", label: "128 × 128 (Large)" },
					{ value: "64", label: "64 × 64 (Medium)" },
					{ value: "48", label: "48 × 48 (Desktop)" },
					{ value: "32", label: "32 × 32 (Standard)" },
					{ value: "16", label: "16 × 16 (Favicon)" },
				],
			},
		],
	},
	seo: {
		title:
			"ICO to PNG — Convert Windows Icon & Favicon (.ico) to PNG | convrtr",
		h1: "Convert Windows Icon (.ico) to PNG",
		intent:
			"Extract crisp, high-resolution transparent PNG images from Windows Icon (.ico) files and web favicons directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an ICO file?",
				a: "An ICO file is an image container used by Microsoft Windows and web browsers for desktop shortcuts, folder icons, and site favicons. A single ICO file typically bundles multiple icon resolutions (16x16, 32x32, 48x48, 64x64, 128x128, and 256x256) encoded as either DIB bitmaps or compressed PNG streams.",
			},
			{
				q: "Why convert ICO to PNG?",
				a: "PNG is a universally supported raster graphics format compatible with all operating systems, web browsers, design software (Figma, Photoshop), and office apps, while preserving 32-bit alpha channel transparency.",
			},
			{
				q: "Which icon resolution is extracted?",
				a: "By default, convrtr automatically scans the icon directory and extracts the largest, highest-bit-depth frame (typically 256x256 32-bit RGBA). You can also explicitly choose a specific resolution (e.g. 16x16 for favicons or 32x32 for standard shortcuts).",
			},
			{
				q: "Are my icon files uploaded to a remote server?",
				a: "Never. All ICO directory parsing, DIB bitmap transparency mask application, and PNG extraction occur 100% locally inside your browser memory. Your files never leave your computer.",
			},
		],
		related: [
			"image/icns-to-png",
			"image/cur-to-png",
			"image/ani-to-png",
			"image/png-to-jpg",
		],
	},
};
