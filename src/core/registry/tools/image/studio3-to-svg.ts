import type { Tool } from "../../types";

export const studio3ToSvg: Tool = {
	id: "image/studio3-to-svg",
	slug: "studio3-to-svg",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-silhouette",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["studio3", "studio"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:studio3-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Vector Exact",
				explanation:
					"Extracts all vector paths, cut contours, shapes, and color coordinates directly into standard SVG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Studio3 to SVG — Convert Silhouette Studio to SVG Online Free | convrtr",
		h1: "Convert Silhouette Studio to SVG",
		intent:
			"Convert Silhouette Studio (.studio3, .studio) craft designs into standard SVG vectors for Cricut Design Space, Glowforge, laser cutters, Inkscape, or Illustrator. Free, instant, in-browser conversion without buying Silhouette Business Edition.",
		faq: [
			{
				q: "Do I need Silhouette Studio Business Edition to export SVG?",
				a: "No! Silhouette locks SVG export behind their paid $99 Business Edition upgrade. This tool parses the vector cut data embedded in your .studio and .studio3 files and exports a clean, standard SVG completely free.",
			},
			{
				q: "Can I open the resulting SVG in Cricut Design Space?",
				a: "Yes. The generated SVG uses standard XML vector elements (<path>, <line>, <rect>, <circle>) that import seamlessly into Cricut Design Space, Brother CanvasWorkspace, LightBurn, and Inkscape.",
			},
			{
				q: "Are my craft and commercial designs uploaded to a server?",
				a: "No. All vector extraction happens 100% locally in your browser using JavaScript. Your files and intellectual property never leave your machine.",
			},
		],
		related: ["image/optimise-svg"],
	},
};
