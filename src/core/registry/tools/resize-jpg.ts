import { defineImageResize } from "./image/defineImageResize";

export const resizeJpg = defineImageResize({
	format: "jpeg",
	ext: "jpg",
	extraExt: ["jpeg"],
	mime: { input: ["image/jpeg", "image/jpg"], output: "image/jpeg" },
	seo: {
		title: "Resize a JPG — free, private, in your browser | convrtr",
		h1: "Resize a JPG",
		intent:
			"Change a JPG's dimensions without uploading it. Resampling uses Lanczos3 rather than the browser's canvas, which downscales with bilinear filtering and leaves photos looking soft. Note that JPEG has no lossless mode: saving the resized image re-encodes it, so the quality setting matters as much as the dimensions.",
		faq: [
			{
				q: "Does resizing a JPG lose quality twice?",
				a: "Effectively yes. The resample discards pixels, and JPEG re-encoding then re-quantises what remains. At the visually-lossless preset the second step is not noticeable, but repeatedly resizing and re-saving the same JPEG will accumulate visible artefacts.",
			},
			{
				q: "Can I set only the width?",
				a: "Yes. Leave the other dimension at 0 and it is derived from the original aspect ratio.",
			},
			{
				q: "What resampling method should I use?",
				a: "Lanczos3 is the sharpest and the sensible default for photos. Mitchell and Catmull-Rom are slightly softer with less ringing around hard edges, which can suit graphics with flat colour better.",
			},
		],
		related: ["image/resize-png", "image/jpg-to-webp", "image/jpg-to-png"],
	},
});
