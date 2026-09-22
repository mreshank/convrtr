import type { Tool } from "../../types";

export const drawioToSvg: Tool = {
	id: "image/drawio-to-svg",
	slug: "drawio-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"application/x-drawio",
			"application/xml",
			"application/octet-stream",
		],
		ext: ["drawio", "dio", "drawio.xml"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:drawio-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Diagram Render",
				explanation:
					"Inflates the mxGraphModel (zlib wrapper or plain XML) and renders every shape, label and connector to a resolution-independent SVG. Geometry, colours and stroke widths transfer exactly; orthogonal edge routing flattens to straight waypoint lines.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "DRAWIO to SVG — Render diagrams.net Files to Vector | convrtr",
		h1: "Convert drawio Diagram to SVG",
		intent:
			"Open a diagrams.net (.drawio) diagram on any device that can't run the editor — phones, tablets, viewers that only accept SVG. This tool inflates the diagram's mxGraphModel (drawio saves it deflate-compressed by default), renders every shape and connector to a clean resolution-independent SVG, and never uploads a byte. Great for self-hosted docs that must render anywhere (r/selfhosted).",
		faq: [
			{
				q: "What is a .drawio file, and why is it a single file?",
				a: "diagrams.net (draw.io) stores each diagram as one XML document of model cells (shapes, labels, connectors). When File > Save is used with compression, that XML is deflated into a zlib wrapper in the same .drawio file — this tool inflates it before rendering.",
			},
			{
				q: "Which shapes are supported?",
				a: "Rectangles, rounded rectangles, ellipses and rhombuses with their fill, stroke and stroke-width palettes, plus connector lines through their recorded waypoints. Everything else (swimlanes, images, ports, arrowheads) falls back to its geometry or is flattened honestly — never dropped silently.",
			},
			{
				q: "How is this different from File > Export in the editor?",
				a: "That needs the editor. This runs entirely in your browser with zero uploads, so it works where draw.io can't be installed, and it can batch-render from CI or a self-hosted file share.",
			},
			{
				q: "Is my diagram uploaded anywhere?",
				a: "No. Inflation and rendering happen entirely inside your browser.",
			},
		],
		related: [
			"image/excalidraw-to-svg",
			"image/wmf-to-svg",
			"document/iso-to-zip",
		],
	},
};
