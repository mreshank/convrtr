import type { Tool } from "../../types";

export const oraToPng: Tool = {
	id: "image/ora-to-png",
	slug: "ora-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/openraster",
			"application/x-openraster",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["ora"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:ora-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full-Resolution Composite Artwork (.png)",
				explanation:
					"Extracts the full-resolution composite rendering of the layered OpenRaster canvas directly from the container.",
				params: { preferMergedImage: true },
			},
			{
				id: "top-layer",
				label: "Topmost Visible Layer Only",
				explanation:
					"Extracts the topmost visible raster artwork layer from the OpenRaster layer stack.",
				params: { preferMergedImage: false },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "preferMergedImage",
				label: "Extract Merged Composite",
				group: "Layer Processing",
				default: true,
			},
		],
	},
	seo: {
		title:
			"OpenRaster ORA to PNG — Convert OpenRaster (.ora) Layered Artwork to PNG | convrtr",
		h1: "Convert OpenRaster (.ora) to PNG",
		intent:
			"Convert OpenRaster (.ora) layered graphics packages created in Krita, MyPaint, and GIMP into crisp, universal 32-bit RGBA PNG images directly in your browser. 100% client-side with zero data uploads.",
		faq: [
			{
				q: "What is an OpenRaster (.ora) file?",
				a: "OpenRaster (.ora) is an open, vendor-neutral file format specification for layered raster graphics created by Freedesktop.org, Krita, MyPaint, and GIMP. Designed as an open alternative to Adobe Photoshop's proprietary .psd, it stores layer stacks, blend modes, and raster tiles inside an open ZIP archive.",
			},
			{
				q: "Why convert OpenRaster files to PNG?",
				a: "Standard web browsers, messaging applications, and social platforms cannot view or preview .ora files natively. Converting OpenRaster files to high-resolution PNG enables instant sharing, printing, and publishing without needing Krita or GIMP installed.",
			},
			{
				q: "Does convrtr preserve transparent backgrounds in ORA files?",
				a: "Yes. convrtr extracts full 32-bit RGBA PNG graphics with complete 8-bit alpha channel transparency, ensuring clear cutouts, transparent backdrops, and exact color preservation.",
			},
			{
				q: "Are my digital illustrations uploaded to any server?",
				a: "Never. All archive extraction, XML stack inspection, and PNG decoding happen 100% inside your browser memory using Web APIs. Your confidential artwork, sketches, and commercial designs never leave your machine.",
			},
		],
		related: [
			"image/clip-to-png",
			"image/procreate-to-png",
			"image/aseprite-to-png",
			"image/gbr-to-png",
		],
	},
};
