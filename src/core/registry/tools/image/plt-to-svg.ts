import type { Tool } from "../../types";

export const pltToSvg: Tool = {
	id: "image/plt-to-svg",
	slug: "plt-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.hp-hpgl",
			"application/x-hpgl",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["plt", "hpgl", "hp2"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:plt-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "svg",
		presets: [
			{
				id: "svg",
				label: "Scalable Vector Graphics (.svg)",
				explanation:
					"Converts plotter pen movement coordinates, absolute/relative polylines, and circles into standards-compliant W3C SVG vector paths.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "PLT to SVG — Convert HP-GL Plotter File to Vector SVG | convrtr",
		h1: "Convert HP-GL PLT Plotter File to Scalable SVG",
		intent:
			"Convert HP-GL and HP-GL/2 (.plt, .hpgl) vector plotter files from CAD, vinyl cutters, and CNC routers into clean, scalable W3C SVG vector graphics directly in your browser.",
		faq: [
			{
				q: "What is a .plt file?",
				a: "A .plt file is an HP-GL (Hewlett-Packard Graphics Language) vector plotting file created by CAD systems (AutoCAD, CorelDRAW) and sent to architectural plotters, laser cutters, vinyl cutters, and CNC machines.",
			},
			{
				q: "Can I open the generated SVG in Illustrator, Figma, or Inkscape?",
				a: "Yes. The generated SVG is pure W3C-compliant XML vector code that opens seamlessly in all vector design suites and web browsers.",
			},
			{
				q: "Are pen selections and colors supported?",
				a: "Yes. SP (Select Pen) commands map pen indices 1 through 8 to distinctive vector stroke colors.",
			},
			{
				q: "Does conversion happen offline?",
				a: "Yes. Vector command parsing and coordinate transformation are performed entirely in your browser using Web Workers.",
			},
		],
		related: ["image/dst-to-svg", "image/cgm-to-svg", "document/dxf-to-svg"],
	},
};
