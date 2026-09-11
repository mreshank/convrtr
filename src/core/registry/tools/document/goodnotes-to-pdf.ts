import type { Tool } from "../../types";

export const goodnotesToPdf: Tool = {
	id: "document/goodnotes-to-pdf",
	slug: "goodnotes-to-pdf",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/x-goodnotes",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["goodnotes"],
	},
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["extract:goodnotes-to-pdf"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Vector Lossless",
				explanation:
					"Extracts original vector PDF pages and merges them into a single PDF document with 100% preservation of text and strokes.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"GoodNotes to PDF — Convert .goodnotes Notebooks to PDF Online Free | convrtr",
		h1: "Convert GoodNotes to PDF",
		intent:
			"Convert GoodNotes (.goodnotes) files directly into standard PDF documents in your browser. Open and read iPad/Mac lecture notes, annotated textbooks, and hand-drawn journals on Windows, Android, or Linux with zero server uploads.",
		faq: [
			{
				q: "Can I open GoodNotes files on Windows or Android?",
				a: "GoodNotes does not natively support Windows or Android without cloud sync and an active subscription. This tool extracts the original PDF pages embedded inside the .goodnotes archive and compiles them into a standard PDF you can open on any device.",
			},
			{
				q: "Will handwriting, annotations, and sketches be preserved?",
				a: "Yes. The extractor preserves the exact vector page layers and rendered drawings stored in the GoodNotes container.",
			},
			{
				q: "Is my personal data or schoolwork kept private?",
				a: "Entirely private. Processing takes place 100% in your browser using local client-side memory. Your notebook never touches an external server or AI cloud.",
			},
		],
		related: ["document/split-pdf", "document/merge-pdf"],
	},
};
