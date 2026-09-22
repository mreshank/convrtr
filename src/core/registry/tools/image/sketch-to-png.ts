import type { Tool } from "../../types";

export const sketchToPng: Tool = {
	id: "image/sketch-to-png",
	slug: "sketch-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-sketch",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["sketch"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:sketch-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full-Resolution Page Preview",
				explanation:
					"Extracts the rendered page preview Sketch saves inside every .sketch document. Bit-exact, zero re-encode.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Sketch to PNG — Open .sketch Files Without a Mac | convrtr",
		h1: "Convert Sketch (.sketch) to PNG",
		intent:
			"View and extract rendered previews from Sketch (.sketch) design files on Windows, Linux, or mobile with no Mac and no Sketch licence. Sketch saves a full page render inside every document — convrtr pulls it out bit-exact in your browser with nothing uploaded.",
		faq: [
			{
				q: "A client sent me a .sketch file and I don't own a Mac. What can I do?",
				a: "Drop it here. Sketch renders each page to previews/preview.png every time the document is saved, and this tool extracts that render at full resolution — enough to review, present, attach to tickets, or hand to developers.",
			},
			{
				q: "Is this the full design or just a thumbnail?",
				a: "The full page render at the resolution Sketch saved it, typically the complete artboard composition. Vector editability is not preserved — for that you need Sketch, Figma's importer, or Lunacy.",
			},
			{
				q: "What if the file was saved without previews?",
				a: "You will get a clear error instead of a corrupt image. Re-saving the document once in Sketch with previews enabled fixes it permanently.",
			},
			{
				q: "Are my client designs uploaded anywhere?",
				a: "No. Unzipping and extraction happen entirely inside your browser. Confidential screens never leave your device.",
			},
		],
		related: ["image/kra-to-png", "image/ora-to-png", "image/cdr-to-png"],
	},
};
