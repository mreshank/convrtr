import type { Tool } from "../types";

export const splitPdf: Tool = {
	id: "document/split-pdf",
	slug: "split-pdf",
	category: "document",
	kind: "extract",
	accept: { mime: ["application/pdf"], ext: ["pdf"] },
	output: { ext: "zip", mime: "application/zip" },
	engines: ["pdf:split"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Copies each page into its own file, keeping the original content streams. Text stays selectable, fonts stay embedded and images keep their exact bytes.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Split a PDF into pages — free, private, in your browser | convrtr",
		h1: "Split a PDF into separate pages",
		intent:
			"Split a PDF into one file per page without uploading it. Each page keeps its original text, fonts and images — nothing is re-rendered. Runs entirely in your browser.",
		faq: [
			{
				q: "Will the pages still have selectable text?",
				a: "Yes. convrtr copies each page's content streams and the resources they reference — fonts, images, colour profiles — into a new document. Nothing is rasterised. Several online splitters render each page to an image instead, which produces files that look right on screen, have no selectable or searchable text at all, and print noticeably worse.",
			},
			{
				q: "Are the images inside degraded?",
				a: "No. An embedded photograph is carried across as the same bytes it already was, because copying a page copies the objects it points at rather than redrawing them.",
			},
			{
				q: "Why do I get a ZIP?",
				a: "Because splitting produces many files, and a browser can only hand you one. The ZIP contains one PDF per page, numbered and zero-padded so they sort correctly in a file listing.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: ["image/jpg-to-pdf", "image/png-to-pdf", "image/png-to-webp"],
	},
};
