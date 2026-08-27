import { defineImageToPdf } from "./image/defineImageToPdf";

export const jpgToPdf = defineImageToPdf({
	format: "jpg",
	extraExt: ["jpeg"],
	mime: ["image/jpeg", "image/jpg"],
	seo: {
		title: "Convert a JPG to PDF — no quality loss | convrtr",
		h1: "Convert a JPG to PDF",
		intent:
			"Wrap a photo in a PDF for an upload form, an application, or a printer. The JPEG is embedded in the PDF exactly as it is — PDF's imaging model understands JPEG natively, so the picture inside the document is byte-identical to the one you started with. Nothing is rasterised or re-compressed. It runs in your browser and the photo is never uploaded.",
		faq: [
			{
				q: "Does converting to PDF reduce my photo's quality?",
				a: "Not here. A JPEG becomes a DCTDecode stream inside the PDF carrying the original bytes, so the image is unchanged. Many converters rasterise the photo or push it through a canvas first, which re-compresses it — you asked for a container change and quietly got a quality loss.",
			},
			{
				q: "Can I control the page size?",
				a: "Yes. The default fits the image to A4 and centres it, which is what most upload forms and printers expect. The alternative makes the page exactly the image's own pixel dimensions, with no margins — usually the better choice for scans and screenshots.",
			},
			{
				q: "Can I put several photos in one PDF?",
				a: "Not yet — each image currently becomes its own single-page PDF. Multi-page merging is on the roadmap.",
			},
		],
		related: [
			"image/png-to-pdf",
			"image/compress-jpg",
			"image/remove-exif-jpg",
		],
	},
});
