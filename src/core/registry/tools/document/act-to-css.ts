import type { Tool } from "../../types";

export const actToCss: Tool = {
	id: "document/act-to-css",
	slug: "act-to-css",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-photoshop-color-table", "application/octet-stream"],
		ext: ["act"],
	},
	output: { ext: "css", mime: "text/css" },
	engines: ["extract:act-to-css"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "CSS Custom Properties & Tailwind Config",
				explanation:
					"Extracts 256-color Adobe Photoshop Color Table (.act) palette files into standard CSS custom properties (:root variables), swatch classes, and a Tailwind CSS color configuration snippet.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"ACT to CSS — Convert Adobe Photoshop Color Table (.act) to CSS Variables & Tailwind | convrtr",
		h1: "Convert Photoshop Color Table to CSS & Tailwind",
		intent:
			"Convert Adobe Photoshop Color Table (.act) palette files into clean CSS custom properties, utility classes, and Tailwind CSS color tokens in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an Adobe Photoshop Color Table (.act) file?",
				a: "An .act file is a compact binary file (typically 768 or 772 bytes) containing 256 RGB colors used in Photoshop for indexed color modes, GIF optimization, and retro game sprite palette creation.",
			},
			{
				q: "How does convrtr handle the 772-byte ACT format with transparency?",
				a: "The extended 772-byte format includes a 4-byte footer specifying the active color count and the index of the transparent color. convrtr identifies the transparent index and annotates it directly in the generated CSS variables.",
			},
			{
				q: "Can I use the output directly in modern web projects?",
				a: "Yes! The output stylesheet includes semantic :root CSS variables (e.g. --palette-0), utility background and text color classes, and a commented JavaScript snippet ready for tailwind.config.js.",
			},
			{
				q: "Are my color palettes uploaded to any cloud server?",
				a: "Never. All byte extraction and CSS generation happen 100% locally in your browser memory.",
			},
		],
		related: ["document/ase-to-css", "image/abr-to-png"],
	},
};
