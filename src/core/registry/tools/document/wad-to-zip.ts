import type { Tool } from "../../types";

export const wadToZip: Tool = {
	id: "document/wad-to-zip",
	slug: "wad-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-doom-wad", "application/octet-stream"],
		ext: ["wad"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:wad-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Structured Game Archive",
				explanation:
					"Extracts sprites, flats, patches, textures, maps, and music from id Tech / Doom WAD files and automatically converts classic 8-bit DMX sound effects into playable WAV audio.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "WAD to ZIP — Extract Doom & id Tech WAD Packages Online | convrtr",
		h1: "Extract Doom WAD to ZIP",
		intent:
			"Extract and unpack Doom, Doom II, Heretic, and Hexen (.wad) game archives into an organized ZIP archive directly in your browser. Extracts sprites, textures, maps, MIDI music, and converts sound effects into standard playable WAV files without SLADE or external software.",
		faq: [
			{
				q: "Does this support both IWAD and PWAD formats?",
				a: "Yes. The extractor parses both official commercial game packages (IWADs like DOOM.WAD and DOOM2.WAD) and user-created modification patches (PWADs).",
			},
			{
				q: "Are classic Doom sound effects converted to playable audio?",
				a: "Yes! Classic Doom sound lumps (DSPISTOL, DSOOF, etc.) use a custom 8-bit unsigned PCM header. convrtr automatically detects these sound lumps and wraps them into standard 44-byte RIFF/WAVE (.wav) files so they play natively on any phone, PC, or digital audio workstation.",
			},
			{
				q: "How are sprites, textures, and maps organized?",
				a: "The tool recognizes section boundary markers (S_START/S_END for sprites, F_START/F_END for flats, P_START/P_END for wall patches, and map markers like E1M1 or MAP01) and groups corresponding assets into designated subdirectories within the ZIP file.",
			},
			{
				q: "Is any data uploaded to a server?",
				a: "No. All WAD directory parsing, sound conversion, and ZIP compression runs 100% locally in your browser memory. Nothing is uploaded.",
			},
		],
		related: ["document/pck-to-zip", "document/rpa-to-zip"],
	},
};
