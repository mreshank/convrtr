import type { Tool } from "../../types";

export const vmsToPng: Tool = {
	id: "image/vms-to-png",
	slug: "vms-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-dreamcast-vms"],
		ext: ["vms", "dci", "vmu"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:vms-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "png",
		presets: [
			{
				id: "png",
				label: "Save Icon PNG (.png)",
				explanation:
					"Extracts and decodes the 32x32 4-bpp ARGB4444 save icon into a standard 32-bit transparent PNG image.",
				params: { json: false, zip: false },
			},
			{
				id: "zip",
				label: "All Icons & Save Payload ZIP (.zip)",
				explanation:
					"Carves all animated icon frames, 72x56 eyecatch bitmap, raw binary game save payload, and metadata manifest into a ZIP package.",
				params: { json: false, zip: true },
			},
			{
				id: "json",
				label: "Save Metadata Manifest (.json)",
				explanation:
					"Extracts game title, save comments, creator application, icon animation parameters, and payload size as JSON.",
				params: { json: true, zip: false },
			},
		],
		advanced: [],
	},
	seo: {
		title: "VMS to PNG — Extract Dreamcast VMU Icons & Saves | convrtr",
		h1: "Extract Sega Dreamcast VMU Icons & Saves",
		intent:
			"Extract 32x32 animated VMU icons, 72x56 eyecatch graphics, and raw save files from Sega Dreamcast .vms, .dci, and .vmu memory card files directly in your browser.",
		faq: [
			{
				q: "What is a Dreamcast .vms file?",
				a: "The Sega Dreamcast Visual Memory Unit (VMU) stores game progress in .vms files. Each file contains a 128-byte metadata header, custom 16-color ARGB4444 icon palettes, 32x32 animated icon frames, an optional 72x56 eyecatch image, and the game save payload.",
			},
			{
				q: "Can this unpack animated icon frames and eyecatch images?",
				a: "Yes. In ZIP mode, convrtr extracts every individual 32x32 animated icon frame, the 72x56 eyecatch graphic, the raw binary save payload, and a full JSON/Markdown manifest.",
			},
			{
				q: "Are Nexus .dci and raw .vmu files supported?",
				a: "Yes. Both standalone .vms saves, Nexus .dci container files, and raw 128KB VMU dumps can be processed directly in your browser without uploading to any remote server.",
			},
		],
		related: [
			"image/nds-to-png",
			"document/gci-to-json",
			"document/mcr-to-zip",
			"document/bup-to-zip",
		],
	},
};
