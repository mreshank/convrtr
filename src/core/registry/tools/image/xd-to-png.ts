import type { Tool } from "../../types";

export const xdToPng: Tool = {
	id: "image/xd-to-png",
	slug: "xd-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/x-xd", "application/zip", "application/octet-stream"],
		ext: ["xd"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:xd-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full-Resolution Artboard Preview",
				explanation:
					"Extracts the rendered artboard preview XD bakes into every document. Bit-exact, zero re-encode.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "XD to PNG — Open Adobe XD Files Without Adobe | convrtr",
		h1: "Convert Adobe XD (.xd) to PNG",
		intent:
			"View and extract rendered artboards from discontinued Adobe XD (.xd) files on any device with no Adobe subscription. XD saves full page renders inside every document — convrtr pulls them out bit-exact in your browser with nothing uploaded.",
		faq: [
			{
				q: "Adobe killed XD and I have old design files. What can I do?",
				a: "Drop them here. Every save bakes raster artboard renders (renditions/) plus thumbnails (previews/) into the file, and this tool extracts the largest render at full resolution — enough to review, present, attach to tickets, or hand to developers.",
			},
			{
				q: "Is this the full design or just a thumbnail?",
				a: "The full artboard render at saved resolution. Vector editability is not preserved — for that, import into Figma (which reads .xd) or Lunacy.",
			},
			{
				q: "What if the file was saved without previews?",
				a: "You get a clear error instead of a corrupt image. Re-saving once in XD (if still installed) regenerates them permanently.",
			},
			{
				q: "Are my client designs uploaded anywhere?",
				a: "No. Unzipping and extraction happen entirely inside your browser.",
			},
		],
		related: ["image/sketch-to-png", "image/kra-to-png", "image/cdr-to-png"],
	},
};
