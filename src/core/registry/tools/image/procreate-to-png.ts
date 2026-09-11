import type { Tool } from "../../types";

export const procreateToPng: Tool = {
	id: "image/procreate-to-png",
	slug: "procreate-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-procreate",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["procreate"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:procreate-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Extracts the full-resolution flattened composite artwork image directly from the Procreate package with zero quality loss.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Procreate to PNG — Extract Full-Res Artwork from .procreate Files | convrtr",
		h1: "Extract Full-Resolution PNG from a Procreate File",
		intent:
			"Extract the high-resolution artwork from any Procreate (.procreate) file directly to a transparent PNG. Works on Windows, Mac, and Linux with no iPad or app installation required. 100% private in-browser extraction.",
		faq: [
			{
				q: "Can I open Procreate files on Windows or Mac without an iPad?",
				a: "Yes. Procreate files package a high-resolution composite rendering of your canvas inside. This tool reads the package structure and extracts the full artwork as a standard PNG you can open anywhere.",
			},
			{
				q: "Is this image flattened or does it contain layers?",
				a: "This extracts the full-resolution flattened composite of your artwork as rendered by Procreate. It is perfect for sharing, printing, or viewing without needing the Procreate application.",
			},
			{
				q: "Does my artwork stay private?",
				a: "Yes, completely. Extraction happens 100% locally in your browser memory. Your artwork is never uploaded to any server or cloud.",
			},
		],
		related: ["video/procreate-to-mp4"],
	},
};
