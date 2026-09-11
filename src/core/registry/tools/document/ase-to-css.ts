import type { Tool } from "../../types";

export const aseToCss: Tool = {
	id: "document/ase-to-css",
	slug: "ase-to-css",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-adobe-swatch-exchange", "application/octet-stream"],
		ext: ["ase"],
	},
	output: { ext: "css", mime: "text/css" },
	engines: ["extract:ase-to-css"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "CSS Custom Properties & Tailwind Config",
				explanation:
					"Parses binary Adobe Swatch Exchange (.ase) palette files across RGB, CMYK, CIE Lab, and Grayscale color models. Generates clean, ready-to-use CSS custom properties (:root variables) and a complete Tailwind CSS configuration snippet with zero quality loss or color shifts.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"ASE to CSS — Convert Adobe Swatch Exchange (.ase) to CSS Variables & Tailwind | convrtr",
		h1: "Convert Adobe Swatch Exchange to CSS & Tailwind",
		intent:
			"Extract Adobe Photoshop, Illustrator, and InDesign .ase color palette libraries into clean CSS custom properties and Tailwind CSS theme configurations directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an Adobe Swatch Exchange (.ase) file?",
				a: "The .ase (Adobe Swatch Exchange) format is Adobe's proprietary binary container used to share color palettes and brand style guides between Adobe Illustrator, Photoshop, InDesign, and Fresco.",
			},
			{
				q: "How does convrtr convert CMYK and Lab swatches to hex values?",
				a: "convrtr mathematically models standard subtractive CMYK-to-sRGB and CIE L*a*b*-to-XYZ conversions using the standard D65 illuminant and sRGB transfer gamma, ensuring brand colors match digital design standards without requiring Adobe Creative Cloud.",
			},
			{
				q: "Can I use the output directly in Tailwind CSS or CSS Modules?",
				a: "Yes! The exported .css file defines all swatches as semantic :root CSS variables (e.g., --color-brand-blue) and provides a commented-out JavaScript configuration block that you can paste directly into your tailwind.config.js theme.extend.colors.",
			},
			{
				q: "Are my proprietary brand color guidelines uploaded to the internet?",
				a: "No. All binary parsing and color space transformations run completely inside your browser's local memory. No files or color codes are ever sent to any remote server.",
			},
		],
		related: ["document/xmind-to-markdown", "image/abr-to-png"],
	},
};
