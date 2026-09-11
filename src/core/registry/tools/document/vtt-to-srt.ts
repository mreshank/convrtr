import type { Tool } from "../../types";

export const vttToSrt: Tool = {
	id: "document/vtt-to-srt",
	slug: "vtt-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/vtt", "text/x-vtt", "text/plain", "application/octet-stream"],
		ext: ["vtt"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:vtt-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard SubRip (.srt) Subtitles",
				explanation:
					"Converts WebVTT (.vtt) video captions, Zoom meeting transcripts, and podcast cues into clean, sequential, millisecond-accurate SubRip (.srt) subtitles.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VTT to SRT — Convert WebVTT (.vtt) Subtitles to SubRip (.srt) | convrtr",
		h1: "Convert WebVTT (.vtt) Subtitles to SRT",
		intent:
			"Convert WebVTT captions (.vtt) from YouTube, Zoom, Microsoft Teams, Coursera, and HTML5 video into clean, standard SubRip (.srt) subtitles in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a WebVTT (.vtt) file?",
				a: "WebVTT (Web Video Text Tracks) is the W3C standard caption and subtitle format for HTML5 video. Widely used across web browsers, YouTube, Vimeo, Zoom cloud recordings, and online learning platforms, it features CSS positioning attributes, voice tags (<v Name>), and millisecond timestamps.",
			},
			{
				q: "Why convert WebVTT to SubRip (.srt)?",
				a: "While WebVTT is dominant on the web, offline media players (VLC on smart TVs, Plex, Kodi), video editors (DaVinci Resolve, Adobe Premiere Pro, Final Cut Pro), and hardware media devices often fail to parse WebVTT tags or position attributes. SubRip (.srt) is the most universally compatible subtitle format in the world.",
			},
			{
				q: "How does convrtr handle timestamps and formatting?",
				a: "convrtr converts WebVTT dot-separated millisecond timestamps (00:01:23.456) into standard comma-separated SRT timestamps (00:01:23,456), normalizes short MM:SS timestamps to standard HH:MM:SS, strips WebVTT CSS alignment settings and class tags, and preserves bold and italic tags.",
			},
			{
				q: "Are my private meeting transcripts uploaded anywhere?",
				a: "Never. All subtitle parsing, cue cleaning, timestamp conversion, and SRT synthesis happen strictly inside your browser memory. Your transcripts never leave your device.",
			},
		],
		related: [
			"document/sub-to-srt",
			"document/ass-to-srt",
			"document/smi-to-srt",
			"document/cue-to-json",
		],
	},
};
