import type { Tool } from "../../types";

export const clipToPng: Tool = {
	id: "image/clip-to-png",
	slug: "clip-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-sqlite3"],
		ext: ["clip"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:clip-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Extracts the full-resolution rendered artwork PNG embedded directly inside the Clip Studio Paint database without re-encoding.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CLIP to PNG — Extract Artwork from Clip Studio Paint Files | convrtr",
		h1: "Extract PNG Artwork from a .clip File",
		intent:
			"Extract high-resolution flattened artwork from Clip Studio Paint (.clip) files directly to transparent PNG images. Open and recover your drawings without needing Clip Studio Paint installed or paying for a license. 100% client-side with zero uploads.",
		faq: [
			{
				q: "Can I open .clip files without Clip Studio Paint?",
				a: "Yes. Clip Studio Paint saves projects as SQLite databases that embed a full-resolution PNG rendering of your canvas. This tool locates that rendered preview and extracts it directly so you can view, print, or share your art anywhere.",
			},
			{
				q: "Does this affect the resolution or quality of the drawing?",
				a: "No. The extracted PNG is the exact composite image that Clip Studio Paint generated at full canvas resolution. There is zero re-encoding or downscaling.",
			},
			{
				q: "Is my artwork uploaded to the cloud?",
				a: "No. All extraction happens in your local browser memory. Your artwork and confidential illustration files never leave your computer or phone.",
			},
		],
		related: ["image/procreate-to-png", "image/png-to-webp"],
	},
};
