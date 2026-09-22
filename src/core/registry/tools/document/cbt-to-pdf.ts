import type { Tool } from "../../types";

export const cbtToPdf: Tool = {
	id: "document/cbt-to-pdf",
	slug: "cbt-to-pdf",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-tar",
			"application/x-cbt",
			"application/octet-stream",
		],
		ext: ["cbt", "tar"],
	},
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["extract:cbt-to-pdf"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Native-Resolution Pages",
				explanation:
					"Binds naturally-sorted page scans into a PDF at native resolution, embedding original JPEG/PNG bytes without re-encoding.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "CBT to PDF — Comic TAR Archive to PDF | convrtr",
		h1: "Convert CBT Comic Archive to PDF",
		intent:
			"Bind a Comic Book TAR (.cbt) archive into a universally readable PDF for e-readers, tablets and printing — page order preserved by natural sort, images embedded without re-encoding, entirely in your browser with nothing uploaded.",
		faq: [
			{
				q: "What is a .cbt file?",
				a: "A comic book archive that uses TAR instead of ZIP (compare .cbz). It holds sequentially scanned page images, popular with Unix-origin collections and some manga scanners.",
			},
			{
				q: "Will pages stay in order?",
				a: "Yes — pages are natural-sorted (page 2 before page 10) across nested folders, matching how comic readers sequence them.",
			},
			{
				q: "Does the PDF lose image quality?",
				a: "No. JPEG and PNG pages are embedded at native resolution without re-encoding; each PDF page is sized to its image.",
			},
			{
				q: "What about .cbr (RAR) comics?",
				a: "RAR decoding needs a native UnRAR binary that browsers cannot ship, so .cbr stays unsupported for now — convert it to .cbt/.cbz with a desktop tool (e.g. comicbox) and bring it here.",
			},
			{
				q: "Is my collection uploaded anywhere?",
				a: "No. Unpacking and PDF binding run entirely inside your browser.",
			},
		],
		related: [
			"document/cbz-to-pdf",
			"document/epub-to-markdown",
			"document/pdb-to-markdown",
		],
	},
};
