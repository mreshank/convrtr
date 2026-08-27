import { defineImageResize } from "./image/defineImageResize";

export const resizePng = defineImageResize({
	format: "png",
	ext: "png",
	mime: { input: ["image/png"], output: "image/png" },
	seo: {
		title: "Resize a PNG — free, private, in your browser | convrtr",
		h1: "Resize a PNG",
		intent:
			"Change a PNG's dimensions without uploading it. Resampling uses Lanczos3, the same family of filter desktop image editors default to, rather than the browser's canvas — canvas downscaling is bilinear, which is why images shrunk by most online tools come out looking soft. The resized image is written back as PNG, which is a lossless format, so nothing is degraded beyond the resize you asked for.",
		faq: [
			{
				q: "Will resizing make my image blurry?",
				a: "Downscaling always discards pixels, but the resampling filter decides how well detail survives. Lanczos3 preserves noticeably more edge detail than the bilinear filtering browsers use for canvas drawing. Upscaling cannot invent detail that was never captured, so enlarging a small image will look soft whatever the filter.",
			},
			{
				q: "Can I set only the width?",
				a: "Yes. Leave the other dimension at 0 and it is calculated from the original aspect ratio, so the image keeps its proportions.",
			},
			{
				q: "Does this upload my image?",
				a: "No. The decode, resample and re-encode all run inside your browser using WebAssembly. You can confirm it by watching your browser's network tab while it works.",
			},
		],
		related: ["image/resize-jpg", "image/png-to-webp", "image/png-to-jpg"],
	},
});
