import { defineMetadataStrip } from "./image/defineMetadataStrip";

export const removeMetadataPng = defineMetadataStrip({
	format: "png",
	ext: "png",
	slug: "remove-metadata-png",
	mime: { input: ["image/png"], output: "image/png" },
	seo: {
		title: "Remove metadata from a PNG | convrtr",
		h1: "Remove metadata from a PNG",
		intent:
			"PNG files can carry text chunks, EXIF blocks and timestamps — often including the name of the software that made them, file paths from the machine it was made on, and in some cases location data. This removes those chunks while copying the compressed image data verbatim, so the pixels are bit-identical to the original.",
		faq: [
			{
				q: "What exactly is removed?",
				a: "Text chunks (tEXt, zTXt, iTXt), the EXIF chunk, and the last-modified timestamp. Text chunks are worth attention: they frequently contain the authoring tool's name and sometimes the full filesystem path of the source file.",
			},
			{
				q: "Will the image look any different?",
				a: "No. Colour and rendering chunks — the ICC profile, gamma, chromaticity, transparency and physical dimensions — are all kept, and the compressed image data is copied unchanged.",
			},
			{
				q: "Is this different from re-saving the PNG?",
				a: "Yes. Re-encoding would produce the same pixels, since PNG is lossless, but would spend significant time recompressing a large image for no benefit. Rewriting the chunk list is near-instant.",
			},
		],
		related: ["image/remove-exif-jpg", "image/png-to-webp", "image/resize-png"],
	},
});
