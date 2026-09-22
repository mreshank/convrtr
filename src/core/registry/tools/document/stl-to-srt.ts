import type { Tool } from "../../types";

export const stlToSrt: Tool = {
	id: "document/stl-to-srt",
	slug: "stl-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-stl", "text/plain", "application/octet-stream"],
		ext: ["stl"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:stl-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Timed Cues",
				explanation:
					"Decodes binary timecodes (at the file's own frame rate) or Spruce text timings into millisecond SubRip cues with teletext styling flattened to plain lines.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "STL to SRT — Broadcast Subtitles to SubRip | convrtr",
		h1: "Convert STL Subtitles to SRT",
		intent:
			"Convert broadcast .stl subtitles — both the binary EBU STL (Tech 3264) exchange format and text Spruce STL — into universally playable SubRip (.srt) for VLC, Plex, Jellyfin and editors. Frame-accurate at the file's own rate, entirely in your browser.",
		faq: [
			{
				q: "Which .stl is this? There are two formats with this extension.",
				a: "Both. Binary EBU STL (1024-byte GSI header + 128-byte TTI blocks, the European broadcast exchange format) and text Spruce STL (timestamped lines) are auto-detected by content — you don't need to know which you have.",
			},
			{
				q: "What happens to colours, boxing and positioning?",
				a: "Dropped, honestly: SubRip has no fields for teletext presentation. Cue text, timing and row breaks survive — everything a player needs.",
			},
			{
				q: "What character sets are supported?",
				a: "The ISO 6937 Western-European Latin path: ASCII direct, combining diacritics resolved to precomposed characters (é, ñ, ç…), teletext controls stripped. Exotic scripts are out of scope and reported, not mangled.",
			},
			{
				q: "Is my pre-release caption file uploaded anywhere?",
				a: "No. Decoding runs entirely inside your browser — broadcast captions are sensitive, so check DevTools Network yourself.",
			},
		],
		related: [
			"document/smi-to-srt",
			"document/ass-to-srt",
			"document/lrc-to-srt",
		],
	},
};
