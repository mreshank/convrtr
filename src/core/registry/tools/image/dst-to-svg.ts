import type { Tool } from "../../types";

export const dstToSvg: Tool = {
	id: "image/dst-to-svg",
	slug: "dst-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: ["application/x-dst", "application/octet-stream"],
		ext: ["dst"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:dst-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Stitch Vector Preview",
				explanation:
					"Decodes every ternary stitch record into per-colour-block vector paths at true 0.1 mm resolution with design statistics embedded.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "DST to SVG — Tajima Embroidery Preview Without Software | convrtr",
		h1: "Convert Tajima DST Embroidery to SVG",
		intent:
			"Preview any Tajima (.dst) machine-embroidery design as a scalable SVG — stitch paths per colour block, true millimetre sizing, stitch/jump/stop counts — with no digitising software and nothing uploaded. Ideal for shop listings, client proofs and pre-sew checks.",
		faq: [
			{
				q: "A client sent a .dst and I have no embroidery software. What can I see?",
				a: "Everything structural: every stitch path drawn per colour block at true scale, plus stitch counts, jumps, colour-change stops and design extents in millimetres — enough to proof, list or quote the design.",
			},
			{
				q: "Are the block colours the real thread colours?",
				a: "No — and any tool claiming otherwise is guessing: DST records where to stop for a colour change but never which colour. Blocks are coloured distinctly so stops are visible; confirm threads against the digitiser's sheet.",
			},
			{
				q: "Can I send this SVG to my machine instead?",
				a: "No — machines need stitch instructions, not pictures. This is a proofing/preview direction (design → picture). For machine formats, convert between DST/PES/JEF with digitising software.",
			},
			{
				q: "Is my client's design uploaded anywhere?",
				a: "No. Decoding and rendering happen entirely inside your browser — unlike embroidery converter sites that keep your files for 24 hours.",
			},
		],
		related: [
			"image/cdr-to-png",
			"image/studio3-to-svg",
			"document/dxf-to-svg",
		],
	},
};
