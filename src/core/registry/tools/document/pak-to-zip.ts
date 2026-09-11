import type { Tool } from "../../types";

export const pakToZip: Tool = {
	id: "document/pak-to-zip",
	slug: "pak-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-quake-pak", "application/octet-stream"],
		ext: ["pak"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:pak-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Directory Extraction",
				explanation:
					"Extracts all maps, 3D models, textures, sounds, and scripts from Quake and GoldSrc (Half-Life) PAK archives into a structured ZIP file preserving exact directory hierarchies.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "PAK to ZIP — Extract Quake & Half-Life PAK Files Online | convrtr",
		h1: "Extract Quake & Half-Life PAK to ZIP",
		intent:
			"Extract and unpack Quake, Quake II, and GoldSrc (Half-Life 1, Counter-Strike 1.6) game packages (.pak) into a standard ZIP archive directly in your browser. Inspect and recover 3D models, textures, sounds, and maps with 100% private client-side processing.",
		faq: [
			{
				q: "Which games use this .pak format?",
				a: "This format is used by id Software's Quake, Quake II, and Valve's GoldSrc engine games including Half-Life 1, Counter-Strike 1.6, Team Fortress Classic, Day of Defeat, and Deathmatch Classic.",
			},
			{
				q: "Does this preserve the original folder hierarchy?",
				a: "Yes. All internal paths (such as sound/weapons/, models/player/, and maps/) are reconstructed precisely within the generated ZIP archive.",
			},
			{
				q: "Are large multi-megabyte PAK files supported?",
				a: "Yes. The extractor processes the binary archive in local memory using efficient byte slice operations, capable of unpacking classic PAK archives in under 100ms.",
			},
			{
				q: "Are my game files uploaded to a remote server?",
				a: "No. All unpacking occurs client-side in your browser's local memory. No files are ever sent over the network.",
			},
		],
		related: ["document/wad-to-zip", "document/pck-to-zip"],
	},
};
