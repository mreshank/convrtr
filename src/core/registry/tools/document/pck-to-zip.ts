import type { Tool } from "../../types";

export const pckToZip: Tool = {
	id: "document/pck-to-zip",
	slug: "pck-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-godot-package", "application/octet-stream"],
		ext: ["pck"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:pck-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless Archive",
				explanation:
					"Extracts all Godot GDScript files, scenes (.tscn), sprites, textures, and audio directly into a standard ZIP archive without compression loss.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Godot PCK to ZIP — Extract .pck Game Asset Packages Online | convrtr",
		h1: "Extract Godot PCK to ZIP",
		intent:
			"Extract and unpack Godot Engine package (.pck) files into a structured ZIP archive directly in your browser. Inspect and recover game assets, scripts, textures, and audio without installing Python or command-line tools.",
		faq: [
			{
				q: "Does this support both Godot 3 and Godot 4 .pck files?",
				a: "Yes. The extractor automatically inspects the GDPC format header and unpacks both Godot 3 (v1) and Godot 4 (v2) package architectures.",
			},
			{
				q: "Can I extract game music, sprites, and scripts?",
				a: "Yes. All resources stored inside the res:// virtual directory tree (including .gd, .tscn, .png, .ogg, .wav, .tres) are extracted into standard folders inside the ZIP archive.",
			},
			{
				q: "Are my game assets uploaded to a server?",
				a: "No. The entire extraction occurs client-side in your browser's memory using Web Workers. No files are ever transmitted across the network.",
			},
		],
		related: [],
	},
};
