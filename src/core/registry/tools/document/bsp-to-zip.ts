import type { Tool } from "../../types";

export const bspToZip: Tool = {
	id: "document/bsp-to-zip",
	slug: "bsp-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/x-source-bsp",
			"application/x-quake-bsp",
			"application/octet-stream",
		],
		ext: ["bsp"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:bsp-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Map Asset Extraction",
				explanation:
					"Extracts embedded custom textures, materials (.vmt/.vtf), 3D models (.mdl), soundscapes, entity scripts, and embedded GoldSrc Miptex textures from Valve Source, GoldSrc, and idTech BSP map files into an organized ZIP archive.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"BSP to ZIP — Extract Valve Source & Half-Life Map Assets Online | convrtr",
		h1: "Extract Valve Source & GoldSrc BSP to ZIP",
		intent:
			"Extract embedded custom materials, textures, 3D models, soundscripts, and entity data from Valve Source (HL2, CS:GO, TF2, GMod) and GoldSrc (HL1, CS 1.6) BSP map files directly in your browser with zero server uploads.",
		faq: [
			{
				q: "What is a .bsp file?",
				a: "A .bsp (Binary Space Partitioning) file is a compiled level map file used in games powered by Valve's Source engine (Half-Life 2, Team Fortress 2, Counter-Strike: Global Offensive, Portal 2, Garry's Mod) and GoldSrc engine (Half-Life 1, Counter-Strike 1.6), as well as id Software's Quake series.",
			},
			{
				q: "What assets can be extracted from a Source Engine BSP?",
				a: "Source engine maps often have custom assets bundled inside Lump 40 (LUMP_PAKFILE). convrtr extracts all embedded custom materials (.vmt), textures (.vtf), 3D props/models (.mdl, .vtx, .vvd), audio files, and the map's entity definition script (Lump 0).",
			},
			{
				q: "Does this support classic Half-Life 1 and Counter-Strike 1.6 BSP maps?",
				a: "Yes! For GoldSrc maps (version 30), convrtr parses Lump 2 (LUMP_TEXTURES) and exports all embedded paletted Miptex textures as lossless, transparent PNG files, along with entity specifications.",
			},
			{
				q: "Do I need GCFScape, Pakrat, or BSPZip installed?",
				a: "No! All parsing and ZIP generation happen 100% inside your web browser using pure TypeScript and WebAssembly. No third-party desktop utilities are needed.",
			},
			{
				q: "Are my BSP map files uploaded to any server?",
				a: "Never. All extraction operations occur entirely within your browser's local memory. None of your game files or creative assets are transmitted over the internet.",
			},
		],
		related: [
			"document/pak-to-zip",
			"document/wad-to-zip",
			"document/pck-to-zip",
		],
	},
};
