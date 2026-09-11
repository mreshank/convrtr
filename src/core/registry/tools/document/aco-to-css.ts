import type { Tool } from "../../types";

export const acoToCss: Tool = {
	id: "document/aco-to-css",
	slug: "aco-to-css",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-photoshop-color-swatch",
			"application/x-adobe-color",
			"application/octet-stream",
		],
		ext: ["aco"],
	},
	output: { ext: "css", mime: "text/css" },
	engines: ["extract:aco-to-css"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "CSS Custom Properties (:root)",
				explanation:
					"Extracts Adobe Photoshop Color Swatch (.aco) files into clean, ready-to-use CSS custom properties with swatch names and hex values.",
				params: { format: "css" },
			},
			{
				id: "visually-lossless",
				label: "Tailwind CSS Color Palette",
				explanation:
					"Formats all color swatches into a JavaScript configuration snippet ready to paste into tailwind.config.js theme.extend.colors.",
				params: { format: "tailwind" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "format",
				label: "Output Format",
				group: "Export",
				default: "css",
				options: [
					{ value: "css", label: "CSS Custom Properties (:root)" },
					{ value: "tailwind", label: "Tailwind CSS Configuration" },
					{ value: "json", label: "Design Tokens JSON" },
				],
			},
		],
	},
	seo: {
		title:
			"ACO to CSS — Convert Adobe Photoshop Color Swatches (.aco) to CSS Variables | convrtr",
		h1: "Convert Photoshop Color Swatches (.aco) to CSS & Tailwind",
		intent:
			"Convert Adobe Photoshop .aco binary color swatch palettes into CSS custom properties and Tailwind CSS color tokens directly in your browser. 100% private in-browser extractor.",
		faq: [
			{
				q: "What is an Adobe Photoshop Color Swatch (.aco) file?",
				a: "The .aco (Adobe Color) file format is Adobe Photoshop's native binary format for storing collections of color swatches. Digital artists, illustrators, and concept designers distribute color palettes as .aco files on platforms like Gumroad and ArtStation.",
			},
			{
				q: "What is the difference between Version 1 and Version 2 in ACO files?",
				a: "Version 1 contains only the raw color space specifications without names. Version 2 appends UTF-16 swatch names created by the artist. convrtr automatically detects both versions and extracts the human-readable names to generate semantic CSS variable names.",
			},
			{
				q: "What color models are supported?",
				a: "convrtr supports all standard Photoshop color modes: RGB, HSB (Hue, Saturation, Brightness), CMYK, CIE Lab, and Grayscale, accurately transforming them into standard sRGB and hex codes.",
			},
			{
				q: "Are my color swatch packs uploaded to a server?",
				a: "Never. All parsing and conversion run 100% locally in your web browser memory using pure TypeScript. No data is ever transmitted over the network.",
			},
		],
		related: [
			"document/ase-to-css",
			"document/act-to-css",
			"image/abr-to-png",
		],
	},
};
