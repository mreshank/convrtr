import type { Tool } from "../../types";

export const cbrToPdf: Tool = {
	id: "document/cbr-to-pdf",
	slug: "cbr-to-pdf",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-rar-compressed",
			"application/vnd.rar",
			"application/octet-stream",
		],
		ext: ["cbr", "rar"],
	},
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["extract:cbr-to-pdf"],
	heavyDownloadMb: 2,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Native-Resolution Pages",
				explanation:
					"Unpacks RAR4/RAR5 with full 7-Zip and binds naturally-sorted pages into a PDF at native resolution, embedding original bytes without re-encoding.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "CBR to PDF — Comic RAR Archive to PDF | convrtr",
		h1: "Convert CBR Comic Archive to PDF",
		intent:
			"Bind a Comic Book RAR (.cbr) archive — RAR4 and RAR5 alike — into a universally readable PDF for e-readers and print. Full 7-Zip decoding in your browser, pages natural-sorted and embedded without re-encoding. Encrypted archives and 500MB+ files fail with specific errors.",
		faq: [
			{
				q: "Why has no browser tool done CBR before?",
				a: "RAR decoding needs native code that browsers can't ship — every web converter shells to an UnRAR binary on a server (and keeps your upload). This compiles full 7-Zip to WebAssembly and runs it locally instead.",
			},
			{
				q: "RAR4 vs RAR5 — does it matter?",
				a: "No. Both codecs ride the same core and are covered by committed fixtures, so old and new archives convert identically.",
			},
			{
				q: "What about password-protected comics?",
				a: "Refused with a clear error — encrypted archives need their password in desktop 7-Zip.",
			},
			{
				q: "Is my collection uploaded anywhere?",
				a: "No. Unpacking and PDF binding run entirely inside your browser.",
			},
		],
		related: [
			"document/cb7-to-pdf",
			"document/cbt-to-pdf",
			"document/cbz-to-pdf",
		],
	},
};
