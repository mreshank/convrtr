import type { Tool } from "../../types";

export const assToSrt: Tool = {
	id: "document/ass-to-srt",
	slug: "ass-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"text/x-ssa",
			"text/x-ass",
			"application/x-ass",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["ass", "ssa"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:ass-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Universal SubRip (.srt) Subtitles",
				explanation:
					"Converts Advanced SubStation Alpha (.ass / .ssa) subtitles into universal SubRip (.srt) subtitles. Strips override tags (karaoke, positioning, vector drawings) while preserving italic and bold tags and normalizing timestamps.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"ASS to SRT — Convert Advanced SubStation Alpha to SubRip (.srt) Online | convrtr",
		h1: "Convert ASS/SSA Subtitles to SRT",
		intent:
			"Convert styled anime and video subtitles (.ass / .ssa) into universally compatible SubRip (.srt) subtitles for Plex, Apple TV, VLC, mobile devices, and Smart TVs with zero server uploads.",
		faq: [
			{
				q: "Why convert ASS/SSA subtitles to SRT?",
				a: "Advanced SubStation Alpha (.ass) contains rich typesetting, vector graphics, karaoke effects, and font styling. However, many Smart TVs, mobile media players, and Plex clients cannot render ASS styling smoothly in hardware, often forcing high-CPU server transcoding that causes video buffering. Converting to SRT provides universal compatibility across all devices without transcoding.",
			},
			{
				q: "Are styling tags like italics and bold preserved?",
				a: "Yes! convrtr translates ASS styling overrides (such as {\\i1} and {\\b1}) into standard HTML <i> and <b> tags supported by all SRT subtitle engines, while stripping vector drawing commands and complex positioning tags.",
			},
			{
				q: "Does this support both .ass and legacy .ssa files?",
				a: "Yes. convrtr parses both SubStation Alpha v4.00 (.ssa) and Advanced SubStation Alpha v4.00+ (.ass) files.",
			},
			{
				q: "How are character encodings handled?",
				a: "convrtr automatically detects UTF-8 (with or without BOM), UTF-16 Little Endian, UTF-16 Big Endian, and Windows-1252 to ensure foreign character scripts (Japanese Kanji/Kana, Korean Hangul, Cyrillic, accented Latin) render cleanly without corruption.",
			},
			{
				q: "Are my subtitle files uploaded to any server?",
				a: "Never. All parsing, tag cleaning, and SubRip SRT formatting happen 100% locally within your browser using Web Standards. Your private media and subtitles never touch an external server.",
			},
		],
		related: [
			"document/sub-to-srt",
			"document/smi-to-srt",
			"document/vnt-to-txt",
		],
	},
};
