import type { Tool } from "../../types";

export const cb7ToPdf: Tool = {
	id: "document/cb7-to-pdf",
	slug: "cb7-to-pdf",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-7z-compressed", "application/octet-stream"],
		ext: ["cb7", "7z"],
	},
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["extract:cb7-to-pdf"],
	heavyDownloadMb: 2,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Native-Resolution Pages",
				explanation:
					"Unpacks with full 7-Zip and binds naturally-sorted pages into a PDF at native resolution, embedding original bytes without re-encoding.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "CB7 to PDF — Comic 7-Zip Archive to PDF | convrtr",
		h1: "Convert CB7 Comic Archive to PDF",
		intent:
			"Bind a Comic Book 7-Zip (.cb7) archive into a universally readable PDF for e-readers and print — any 7z codec including solid blocks, pages natural-sorted and embedded without re-encoding, entirely in your browser. Encrypted archives and 500MB+ files fail with specific errors.",
		faq: [
			{
				q: "What is a .cb7 file?",
				a: "A comic book archive compressed with 7-Zip (LZMA family) instead of ZIP — smaller than .cbz, unreadable to most comic readers and all e-readers without conversion.",
			},
			{
				q: "Why does it need a 2MB download first?",
				a: "Full 7-Zip is compiled to WebAssembly for this tool — the engine loads once, on demand, only when you convert. The UI asks before spending it, like the video and database tools.",
			},
			{
				q: "What about password-protected comics?",
				a: "Refused with a clear error — encrypted archives need their password in desktop 7-Zip, and this tool won't pretend otherwise.",
			},
			{
				q: "And .cbr (RAR) comics?",
				a: "The same 7-Zip core reads RAR, so CBR support rides this exact pipeline — it ships as its own tool next, reusing this engine family.",
			},
			{
				q: "Is my collection uploaded anywhere?",
				a: "No. Unpacking and PDF binding run entirely inside your browser.",
			},
		],
		related: [
			"document/cbt-to-pdf",
			"document/cbz-to-pdf",
			"document/epub-to-markdown",
		],
	},
};
