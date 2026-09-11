import type { Tool } from "../../types";

export const dxfToSvg: Tool = {
	id: "document/dxf-to-svg",
	slug: "dxf-to-svg",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/dxf",
			"application/x-dxf",
			"image/vnd.dxf",
			"image/x-dxf",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["dxf"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:dxf-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Scalable Vector Graphics (SVG)",
				explanation:
					"Converts 2D AutoCAD Drawing Exchange Format (.dxf) CAD, CNC, and laser-cutting geometry into clean, responsive SVG vectors with automatic bounding box projection.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"DXF to SVG — Convert AutoCAD DXF 2D CAD & CNC Files to SVG | convrtr",
		h1: "Convert AutoCAD DXF to Scalable SVG",
		intent:
			"Convert AutoCAD DXF (.dxf) 2D vector CAD drawings, CNC toolpaths, floor plans, and laser-cutting designs into clean, scalable SVG vector graphics in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an AutoCAD DXF (.dxf) file?",
				a: "DXF (Drawing Exchange Format) is Autodesk's open CAD data file format created to enable interoperability between AutoCAD and other computer-aided design, CNC machining, laser cutting, and 3D modeling programs.",
			},
			{
				q: "Which DXF entities are supported in this conversion?",
				a: "convrtr supports standard 2D entities including LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, and TEXT, calculating optimal bounding box viewports and converting AutoCAD's Cartesian coordinates into SVG screen space.",
			},
			{
				q: "Can I use the output SVG for laser cutting or web display?",
				a: "Yes! The exported SVG includes precision vector-effect paths suitable for LightBurn, Glowforge, Cricut Design Space, web browsers, and graphic editors like Illustrator and Figma.",
			},
			{
				q: "Are my proprietary CAD blueprints uploaded to any cloud server?",
				a: "Never. All entity parsing, coordinate projection, and SVG serialization run 100% locally in your browser memory.",
			},
		],
		related: ["image/studio3-to-svg", "document/xmind-to-markdown"],
	},
};
