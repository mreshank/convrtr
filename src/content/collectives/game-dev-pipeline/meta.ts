import type { CollectiveMeta } from "../types";

export const meta: CollectiveMeta = {
	slug: "game-dev-pipeline",
	title: "Game developer asset pipeline",
	why: "Game developers routinely deal with engine archives, raw sprite sheets, and specialized GPU texture compressions. Extract Godot PCK and Ren'Py RPA game packages into ZIPs, convert Valve VTF and DirectDraw Surface DDS textures to transparent PNGs, and export Aseprite animations without launching heavyweight game editors.",
	toolIds: [
		"document/pck-to-zip",
		"document/rpa-to-zip",
		"image/dds-to-png",
		"image/tga-to-png",
		"image/vtf-to-png",
		"image/aseprite-to-png",
		"document/wad-to-zip",
		"audio/vag-to-wav",
		"audio/aud-to-wav",
		"document/aco-to-css",
		"image/chr-to-png",
		"image/ora-to-png",
	],
};
