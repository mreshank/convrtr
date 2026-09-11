import type { Tool } from "../../types";

export const wmfToSvg: Tool = {
	id: "image/wmf-to-svg",
	slug: "wmf-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/wmf",
			"image/x-wmf",
			"image/x-win-metafile",
			"application/x-msmetafile",
			"application/wmf",
			"application/octet-stream",
		],
		ext: ["wmf"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:wmf-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Scalable Vector Graphics (SVG)",
				explanation:
					"Converts legacy 16-bit Windows Metafile (.wmf) GDI commands, Office clip art, and vector graphics into clean, scalable SVG vector elements.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"WMF to SVG — Convert Windows Metafile (.wmf) Clip Art to SVG | convrtr",
		h1: "Convert Windows Metafile WMF to SVG",
		intent:
			"Convert legacy 16-bit Windows Metafile (.wmf) clip art, diagrams, and vector illustrations into modern, scalable SVG graphics in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a Windows Metafile (.wmf) file?",
				a: "WMF is a 16-bit vector graphic format developed by Microsoft in the early 1990s for Windows 3.0 and Microsoft Office. It records GDI drawing operations such as lines, polygons, arcs, and text.",
			},
			{
				q: "Why convert WMF to SVG?",
				a: "Modern web browsers, design software, and macOS/Linux systems cannot natively display legacy 16-bit WMF files. Converting to SVG transforms vintage Microsoft Office clip art and technical drawings into resolution-independent modern vectors.",
			},
			{
				q: "Are Aldus Placeable Header WMF files supported?",
				a: "Yes! convrtr supports both standard Windows Metafiles and Placeable WMF files (APM header 0x9AC6CDD7), accurately calculating aspect ratios and bounding boxes.",
			},
			{
				q: "Are my illustrations uploaded to a server?",
				a: "Never. All GDI record parsing and SVG path generation occur 100% locally in your browser memory.",
			},
		],
		related: [
			"document/dxf-to-svg",
			"image/studio3-to-svg",
			"image/optimise-svg",
		],
	},
};
