import type { Tool } from "../../types";

export const lrcToSrt: Tool = {
	id: "document/lrc-to-srt",
	slug: "lrc-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/octet-stream"],
		ext: ["lrc"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:lrc-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Chained Cues",
				explanation:
					"Fans each lyric timestamp out to numbered cues chained end-to-start, honouring offset headers and merging duplicate timestamps. Timestamps are preserved to the millisecond.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "LRC to SRT — Karaoke Lyrics to Subtitles | convrtr",
		h1: "Convert LRC Lyrics to SRT Subtitles",
		intent:
			"Turn karaoke and music-player .lrc lyric files into universally playable SubRip (.srt) subtitles for VLC, Plex, Jellyfin and video editors. Handles multi-timestamp lines, offset headers and word-timing tags — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "What is an .lrc file?",
				a: "The lyric format of karaoke players and music apps: timestamped lines like [01:23.45] lyric text, optionally with [ti:]/[ar:]/[offset:] headers. Video players cannot read it — SRT conversion makes lyrics display as subtitles.",
			},
			{
				q: "How are cue timings decided?",
				a: "Each lyric timestamp starts a cue; each cue ends when the next begins (capped at 8 seconds, 2 seconds for the final line), so synced lyrics flow exactly like the song.",
			},
			{
				q: "Do offset and word-timing tags survive?",
				a: "The global [offset:] shift is applied to every cue, and inline word-timing tags are flattened to plain lyric lines — SRT has no per-word timing field.",
			},
			{
				q: "Is my file uploaded anywhere?",
				a: "No. Parsing and SRT generation run entirely inside your browser.",
			},
		],
		related: [
			"document/smi-to-srt",
			"document/sub-to-srt",
			"document/ass-to-srt",
		],
	},
};
