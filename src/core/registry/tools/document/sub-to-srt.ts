import type { Tool } from "../../types";

export const subToSrt: Tool = {
	id: "document/sub-to-srt",
	slug: "sub-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/x-microdvd",
			"application/x-subviewer",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["sub"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:sub-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard SubRip (.srt) Subtitles",
				explanation:
					"Converts MicroDVD frame-based (.sub) subtitles into standard millisecond-timed SubRip (.srt) subtitles. Automatically detects video framerates (e.g. 23.976, 25.0, 29.97 FPS), cleans control tags, converts pipes to proper linebreaks, and formats italic/bold tags.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SUB to SRT — Convert MicroDVD (.sub) Subtitles to SubRip (.srt) Online | convrtr",
		h1: "Convert MicroDVD (.sub) Subtitles to SRT",
		intent:
			"Convert frame-based MicroDVD (.sub) subtitle files into universally compatible SubRip (.srt) subtitles for Plex, VLC, Apple TV, Jellyfin, and Smart TVs with zero server uploads.",
		faq: [
			{
				q: "What is a MicroDVD .sub file?",
				a: "MicroDVD (.sub) is a legacy text-based subtitle format that defines subtitle display times using movie frame numbers (e.g. {100}{150}Hello) rather than hours, minutes, and seconds. It was widely used during the DivX/XviD era.",
			},
			{
				q: "Why do modern players fail to display .sub files?",
				a: "Modern media players and streaming platforms (such as Plex, Apple TV, iOS, and Smart TVs) require time-based subtitle formats like SubRip (.srt) or WebVTT (.vtt). Because MicroDVD uses frame numbers, players cannot determine when to display subtitles without knowing the exact video framerate.",
			},
			{
				q: "How does convrtr determine the video framerate (FPS)?",
				a: "convrtr automatically parses the initial header cue in the file (such as {1}{1}23.976 or {1}{1}25) to detect the exact authoring framerate. If no explicit header is present, it intelligently defaults to cinematic 23.976 FPS to calculate precise millisecond timestamps.",
			},
			{
				q: "Are formatting tags and linebreaks preserved?",
				a: "Yes! convrtr converts MicroDVD pipe separators (|) into proper subtitles newlines and translates {Y:i} and {Y:b} tags into standard HTML <i> and <b> tags supported by all SRT players, while stripping non-standard proprietary tags.",
			},
			{
				q: "Are my subtitle files uploaded to any server?",
				a: "Never. All parsing, framerate calculation, and SRT generation run 100% locally inside your web browser. No data ever leaves your computer.",
			},
		],
		related: [
			"document/smi-to-srt",
			"document/vcf-to-csv",
			"document/vnt-to-txt",
		],
	},
};
