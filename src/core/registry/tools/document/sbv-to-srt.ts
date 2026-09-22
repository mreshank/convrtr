import type { Tool } from "../../types";

export const sbvToSrt: Tool = {
	id: "document/sbv-to-srt",
	slug: "sbv-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/octet-stream"],
		ext: ["sbv"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:sbv-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Numbered Cues",
				explanation:
					"Converts dotted SBV timestamps to millisecond SubRip timestamps and numbers every cue. Text and timing transfer exactly.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "SBV to SRT — YouTube Captions to SubRip | convrtr",
		h1: "Convert YouTube SBV Captions to SRT",
		intent:
			"Turn YouTube SubViewer (.sbv) caption downloads into universally playable SubRip (.srt) for VLC, Plex, Jellyfin and editors. Dotted timestamps become comma-millis, cues get numbered — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "Where do .sbv files come from?",
				a: "YouTube's subtitle downloads (and yt-dlp --write-subs): SBV is YouTube's flavour of timed text — same cues as SRT, different punctuation.",
			},
			{
				q: "What actually changes?",
				a: "Two things: `0:00:01.000` becomes `00:00:01,000`, and each cue gains its sequence number. Text, line breaks and basic formatting survive untouched.",
			},
			{
				q: "Is my file uploaded anywhere?",
				a: "No. Parsing and SRT generation run entirely inside your browser.",
			},
		],
		related: [
			"document/lrc-to-srt",
			"document/stl-to-srt",
			"document/vtt-to-srt",
		],
	},
};
