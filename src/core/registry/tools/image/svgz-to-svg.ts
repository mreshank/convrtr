import type { Tool } from "../../types";

export const svgzToSvg: Tool = {
	id: "image/svgz-to-svg",
	slug: "svgz-to-svg",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/svg+xml-compressed",
			"application/x-gzip",
			"application/gzip",
			"application/octet-stream",
		],
		ext: ["svgz"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:svgz-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed SVG",
				explanation:
					"Decompresses Gzip-compressed SVG (.svgz) vector graphics into clean, standard, editable SVG XML.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "SVGZ to SVG — Decompress SVGZ to Clean SVG Online | convrtr",
		h1: "Convert and Decompress SVGZ to SVG",
		intent:
			"Decompress Gzip-compressed SVG vector files (.svgz) from Adobe Illustrator, Inkscape, GIS maps, and vector libraries into clean, editable SVG XML in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an SVGZ (.svgz) file?",
				a: "SVGZ is a standard Scalable Vector Graphics (SVG) file compressed using GZIP to minimize download bandwidth. Popularized by Adobe Illustrator and Inkscape, it reduces vector file sizes by 50% to 80%.",
			},
			{
				q: "Why won't Figma, Canva, or my browser open .svgz files directly?",
				a: "When accessed from a local file system (rather than a web server sending HTTP Content-Encoding: gzip headers), many web design apps, code editors, and browsers fail to decompress SVGZ files. Converting to uncompressed SVG allows immediate editing in Figma, Illustrator, Sketch, Canva, and web apps.",
			},
			{
				q: "Is any vector graphic quality lost during conversion?",
				a: "None. GZIP compression is 100% lossless. Decompressing an SVGZ recovers the exact, byte-for-byte original XML vector paths, coordinates, CSS styles, and gradients.",
			},
			{
				q: "Are my proprietary vector graphics uploaded to any server?",
				a: "Never. All GZIP inflation and XML validation execute completely within your browser client memory.",
			},
		],
		related: [
			"image/optimise-svg",
			"image/studio3-to-svg",
			"document/dxf-to-svg",
			"image/wmf-to-svg",
		],
	},
};
