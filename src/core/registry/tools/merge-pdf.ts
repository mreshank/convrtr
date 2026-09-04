import type { Tool } from "../types";

export const mergePdf: Tool = {
	id: "document/merge-pdf",
	slug: "merge-pdf",
	category: "document",
	kind: "edit",
	accept: { mime: ["application/pdf"], ext: ["pdf"] },
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["pdf:merge"],
	// Several files in, one out — so dropping many files must not run the batch
	// path, which would convert each separately.
	combinesInputs: true,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Copies every page into one document, keeping the original content streams. Text stays selectable, fonts stay embedded and images keep their exact bytes.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Merge PDFs — free, private, in your browser | convrtr",
		h1: "Merge PDF files",
		intent:
			"Combine several PDFs into one without uploading them. Pages are copied rather than re-rendered, so text stays selectable and images keep their exact bytes. Runs entirely in your browser.",
		faq: [
			{
				q: "What order will the pages be in?",
				a: "The order you added the files, with each document's pages kept together and in sequence. convrtr does not sort by filename behind your mind — if you need a different order, add the files in that order.",
			},
			{
				q: "Does merging reduce quality?",
				a: "No. Each page's content streams and the resources they reference — fonts, embedded images, colour profiles — are copied into the new document unchanged. Nothing is rasterised or re-compressed, which is what separates this from tools that render each page to an image first.",
			},
			{
				q: "Are bookmarks and form fields kept?",
				a: "No, and convrtr tells you when a file had them rather than letting you find out later. Bookmarks and interactive form fields live in document-level structures that reference pages rather than belonging to them, so a page copy does not carry them. The pages and their appearance all come across; the navigation tree and the fillable fields do not. If a form's values matter, fill and flatten it before merging.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: ["document/split-pdf", "image/jpg-to-pdf", "image/png-to-pdf"],
	},
};
