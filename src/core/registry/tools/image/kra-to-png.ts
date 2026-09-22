import type { Tool } from "../../types";

export const kraToPng: Tool = {
	id: "image/kra-to-png",
	slug: "kra-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-krita",
			"application/x-kra",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["kra"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:kra-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full-Resolution Flattened Artwork",
				explanation:
					"Extracts the full-resolution flattened composite (mergedimage.png) Krita bakes into every .kra document. Bit-exact, zero re-encode.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "KRA to PNG — Open Krita Files Without Krita | convrtr",
		h1: "Convert Krita (.kra) to PNG",
		intent:
			"Open and extract full-resolution artwork from Krita (.kra) files on any device without installing Krita. Krita bakes a flattened composite into every document — convrtr pulls it out bit-exact in your browser with nothing uploaded.",
		faq: [
			{
				q: "Krita won't open / I don't have Krita. Can I still get my artwork?",
				a: "Yes. Every .kra file contains a full-resolution flattened render (mergedimage.png) alongside the layer data. This tool extracts that render directly, which is exactly the trick community members use with manual ZIP renaming — automated, in one click, on any device.",
			},
			{
				q: "Is this the full quality or just a thumbnail?",
				a: "Full quality. mergedimage.png is rendered at the canvas resolution, not a small file-manager thumbnail. A smaller preview.png fallback is used only if the merged image is missing.",
			},
			{
				q: "Does it preserve layers?",
				a: "No — PNG is a flat format, so layers come out composited exactly as Krita last rendered them. To keep editing layers you need Krita itself (free on Windows, Mac and Linux).",
			},
			{
				q: "Are my paintings uploaded anywhere?",
				a: "No. The archive is unzipped and the image extracted entirely inside your browser. Your artwork never leaves your device.",
			},
		],
		related: [
			"image/ora-to-png",
			"image/clip-to-png",
			"image/procreate-to-png",
		],
	},
};
