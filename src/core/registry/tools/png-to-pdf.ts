import { defineImageToPdf } from "./image/defineImageToPdf";

export const pngToPdf = defineImageToPdf({
	format: "png",
	mime: ["image/png"],
	seo: {
		title: "Convert a PNG to PDF — no quality loss | convrtr",
		h1: "Convert a PNG to PDF",
		intent:
			"Wrap a PNG in a PDF for sharing, printing or an upload form. The PNG is embedded directly — PDF understands its compression natively — so the image inside the document is byte-identical to the original, transparency and all. It runs entirely in your browser.",
		faq: [
			{
				q: "What happens to transparency?",
				a: "It is preserved in the embedded image. Be aware that a transparent area will show whatever is behind it, which for most viewers and printers means white — so a logo designed for a dark background can look wrong on paper.",
			},
			{
				q: "Is the image re-compressed?",
				a: "No. The PNG's compressed data is embedded as-is rather than being decoded and re-encoded, so nothing is lost and the conversion is near-instant even for large images.",
			},
			{
				q: "Which page size should I pick?",
				a: "Fit to A4 for anything going to a printer or an upload form. Match-the-image is better for screenshots and scans, where added margins are usually unwanted.",
			},
		],
		related: [
			"image/jpg-to-pdf",
			"image/png-to-webp",
			"image/remove-metadata-png",
		],
	},
});
