import type { Tool } from "../../types";

export const jefToSvg: Tool = {
	id: "image/jef-to-svg",
	slug: "jef-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: ["application/x-janome", "application/octet-stream"],
		ext: ["jef"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:jef-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Stitch Vector Preview",
				explanation:
					"Reads the header stitch offset and colour count, decodes signed-delta stitches and 4-byte commands into per-thread vector paths at true 0.1 mm resolution.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "JEF to SVG — Janome Embroidery Preview Without Software | convrtr",
		h1: "Convert Janome JEF Embroidery to SVG",
		intent:
			"Preview any Janome/Elna (.jef) machine-embroidery design as a scalable SVG — stitch paths per thread block, true millimetre sizing, hoop and colour-change counts — with no Digitizer software and nothing uploaded. Completes the DST/EXP/JEF preview family.",
		faq: [
			{
				q: "How is JEF different from DST and EXP?",
				a: "Same stitch philosophy, Janome's container: a ~1.4KB header (stitch offset, hoop, colour count) plus signed-delta stitches and 4-byte commands. JEF even names its thread count — but like its cousins it stores no actual thread colours.",
			},
			{
				q: "Are the block colours the real thread colours?",
				a: "No — JEF's colours need Janome's magic-number lookup, so blocks render neutrally and distinctly with thread indices in the legend. Confirm threads against the digitiser's sheet.",
			},
			{
				q: "Can I sew from the SVG?",
				a: "No — machines need stitch instructions, not pictures. This is the proofing direction for listings, client approval and pre-sew checks.",
			},
			{
				q: "Is my design uploaded anywhere?",
				a: "No. Decoding and rendering happen entirely inside your browser.",
			},
		],
		related: ["image/dst-to-svg", "image/exp-to-svg", "image/studio3-to-svg"],
	},
};
