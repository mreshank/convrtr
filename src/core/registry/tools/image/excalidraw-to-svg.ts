import type { Tool } from "../../types";

export const excalidrawToSvg: Tool = {
	id: "image/excalidraw-to-svg",
	slug: "excalidraw-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: ["application/json", "text/plain", "application/octet-stream"],
		ext: ["excalidraw"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:excalidraw-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Clean Vector Render",
				explanation:
					"Renders shapes, text, arrows and embedded images as clean SVG geometry at scene coordinates. Hand-drawn roughness is flattened; layout and content are exact.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Excalidraw to SVG — Whiteboards Without the App | convrtr",
		h1: "Convert Excalidraw (.excalidraw) to SVG",
		intent:
			"Turn an Excalidraw whiteboard file into a portable SVG for docs, slides, print and the web — geometry, colours, text and arrows preserved, embedded images inlined — without opening the editor and without uploading. Simplified cleanly where hand-drawn style can't transfer.",
		faq: [
			{
				q: "Will it look exactly like Excalidraw?",
				a: "Layout, colours, text and arrows transfer exactly; the signature hand-drawn wobble and hachure fills are flattened to clean geometry. For pixel-perfect exports use Excalidraw itself — for docs and slides, this is sharper anyway.",
			},
			{
				q: "What happens to pasted images?",
				a: "Images embedded in the file (the files map) are inlined as data URLs and render normally. Images referenced but not embedded get an honest labelled placeholder instead of a broken link.",
			},
			{
				q: "Can I convert SVG back to Excalidraw?",
				a: "Not with this tool — scene structure (bindings, groups, history) doesn't survive flattening. This is the publishing direction: whiteboard → portable picture.",
			},
			{
				q: "Is my whiteboard uploaded anywhere?",
				a: "No. Parsing and rendering happen entirely inside your browser.",
			},
		],
		related: ["image/dst-to-svg", "document/dxf-to-svg", "image/wmf-to-svg"],
	},
};
