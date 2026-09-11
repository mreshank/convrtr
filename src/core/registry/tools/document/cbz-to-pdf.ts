import type { Tool } from "../../types";

export const cbzToPdf: Tool = {
	id: "document/cbz-to-pdf",
	slug: "cbz-to-pdf",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.comicbook+zip",
			"application/x-cbz",
			"application/zip",
			"application/x-zip-compressed",
			"application/octet-stream",
		],
		ext: ["cbz", "zip"],
	},
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["extract:cbz-to-pdf"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Bound Comic PDF Document",
				explanation:
					"Extracts all comic book pages (.jpg, .png, .webp) in natural numerical order and compiles them into a single, high-fidelity PDF document.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "CBZ to PDF — Convert Comic Book Archive (.cbz) to PDF | convrtr",
		h1: "Convert Comic Book Archive (.cbz) to PDF",
		intent:
			"Convert Comic Book ZIP archives (.cbz) and manga chapters into high-resolution, sequentially bound PDF documents directly in your browser. 100% client-side with zero server uploads.",
		faq: [
			{
				q: "What is a CBZ file?",
				a: "A CBZ (Comic Book ZIP) file is an archive container holding scanned comic book or manga pages (JPEG, PNG, or WebP) alongside optional metadata (ComicInfo.xml). It is popular among comic readers such as Tachiyomi, CDisplay Ex, and YACReader.",
			},
			{
				q: "Why convert CBZ to PDF?",
				a: "PDF is universally readable on Amazon Kindle, Apple Books, Android tablets, e-readers, and any modern web browser or office suite without requiring specialized comic book reading software.",
			},
			{
				q: "How are pages ordered during conversion?",
				a: "convrtr uses natural alphanumeric sorting so that pages like 'page_2.jpg' correctly precede 'page_10.jpg', preventing out-of-order panels while automatically filtering out thumbnail caches and OS metadata like __MACOSX.",
			},
			{
				q: "Are my comic files uploaded to a remote server?",
				a: "Never. All ZIP decompression, image scanning, and PDF compilation take place 100% locally in your web browser using WebAssembly and memory buffers. Your files never touch a remote server.",
			},
		],
		related: [
			"image/jpg-to-pdf",
			"image/png-to-pdf",
			"document/goodnotes-to-pdf",
			"document/chm-to-zip",
		],
	},
};
