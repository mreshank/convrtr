import type { Tool } from "../../types";

export const expToSvg: Tool = {
	id: "image/exp-to-svg",
	slug: "exp-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: ["application/x-melco", "application/octet-stream"],
		ext: ["exp"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:exp-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Stitch Vector Preview",
				explanation:
					"Decodes headerless 2's-complement stitch moves with jump/stop control codes into per-colour-block vector paths at true 0.1 mm resolution.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "EXP to SVG — Melco Embroidery Preview Without Software | convrtr",
		h1: "Convert Melco EXP Embroidery to SVG",
		intent:
			"Preview any Melco/Bernina (.exp) machine-embroidery design as a scalable SVG — stitch paths per colour block, true millimetre sizing, stitch/jump/stop counts — with no digitising software and nothing uploaded. The headerless-format companion to dst-to-svg.",
		faq: [
			{
				q: "How is EXP different from DST?",
				a: "Same stitch philosophy, simpler container: EXP has no 512-byte header at all — moves start at byte zero as signed XY pairs with 0x80 control codes for jumps, stops and end. Both store no thread colours.",
			},
			{
				q: "Are the block colours the real thread colours?",
				a: "No — EXP, like DST, records where to stop, never which thread. Blocks are coloured distinctly so stops are visible; confirm threads against the digitiser's sheet.",
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
		related: [
			"image/dst-to-svg",
			"image/studio3-to-svg",
			"document/dxf-to-svg",
		],
	},
};
