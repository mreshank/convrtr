import type { Tool } from "../types";

export const gifFrames: Tool = {
	id: "image/gif-to-frames",
	slug: "gif-to-frames",
	category: "image",
	kind: "extract",
	accept: { mime: ["image/gif"], ext: ["gif"] },
	output: { ext: "zip", mime: "application/zip" },
	engines: ["image:gif-frames-pack"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Each frame is written as a lossless PNG, exactly as the GIF stored it.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Extract frames from a GIF — every frame as a PNG | convrtr",
		h1: "Extract GIF frames",
		intent:
			"Pull every frame out of an animated GIF as numbered PNG files, delivered as a ZIP. Useful for editing a single frame, building a sprite sheet, or grabbing one still out of a reaction GIF. Frames are written as lossless PNGs, so each one is exactly what the GIF stored. It runs in your browser and the file is never uploaded.",
		faq: [
			{
				q: "Why is this not available in my browser?",
				a: "It uses the browser's own built-in GIF decoder via the ImageDecoder API, which Chrome, Edge and Safari 17 or later support but Firefox does not yet. Using the browser's decoder rather than bundling a JavaScript one keeps the download small and avoids a second source of decoding bugs — the trade is that support is narrower.",
			},
			{
				q: "Is there a limit on frames?",
				a: "300. Each frame becomes a full PNG, so a long animation produces far more data than a browser can hold in one archive — a 500-frame GIF at 800×600 is over a gigabyte. If your GIF is longer, the ZIP includes a note saying exactly how many frames it has and how many were extracted, rather than quietly handing back a partial result.",
			},
			{
				q: "Are the frames the same quality as the GIF?",
				a: "Yes. GIF frames are already limited to 256 colours by the format, and PNG stores those exactly. Nothing is re-compressed or degraded.",
			},
			{
				q: "How are the files named?",
				a: "frame-01.png, frame-02.png and so on, zero-padded so they sort correctly in a file manager — otherwise frame-2 would sort after frame-10.",
			},
		],
		related: [
			"image/png-to-webp",
			"image/favicon-generator",
			"image/resize-png",
		],
	},
};
