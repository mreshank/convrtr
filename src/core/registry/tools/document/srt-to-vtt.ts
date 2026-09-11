import type { Tool } from "../../types";

export const srtToVtt: Tool = {
	id: "document/srt-to-vtt",
	slug: "srt-to-vtt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-subrip", "text/plain", "application/octet-stream"],
		ext: ["srt"],
	},
	output: { ext: "vtt", mime: "text/vtt" },
	engines: ["extract:srt-to-vtt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard WebVTT (.vtt) Captions",
				explanation:
					"Converts SubRip (.srt) subtitles into W3C-standard WebVTT (.vtt) format with dot-separated millisecond timestamps ready for HTML5 video players, YouTube, and Vimeo.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SRT to VTT — Convert SubRip (.srt) Subtitles to WebVTT (.vtt) | convrtr",
		h1: "Convert SubRip (.srt) Subtitles to WebVTT",
		intent:
			"Convert SubRip (.srt) subtitles into HTML5-ready WebVTT (.vtt) captions directly in your browser. Compatible with YouTube, Vimeo, Video.js, Coursera, and web video players. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is the difference between SRT and WebVTT?",
				a: "SubRip (.srt) is a legacy text subtitle format using commas for millisecond timestamps (00:01:23,456). WebVTT (.vtt) is the W3C standard for HTML5 video, requiring a 'WEBVTT' header and dot-separated millisecond timestamps (00:01:23.456). HTML5 <video><track> elements only accept WebVTT.",
			},
			{
				q: "Why do I need to convert SRT to VTT?",
				a: "Modern web browsers, YouTube, Vimeo, and web video libraries (Video.js, Plyr, hls.js) strictly require WebVTT for closed captions. Uploading an SRT file to HTML5 <track> fails silently. Converting to WebVTT guarantees browser compatibility.",
			},
			{
				q: "How does convrtr convert timestamps?",
				a: "convrtr translates SubRip comma timestamps into W3C dot timestamps, ensures full HH:MM:SS.mmm padding, strips deprecated HTML font tags, and preserves italic/bold tags without changing audio sync.",
			},
			{
				q: "Are my subtitles sent to any remote server?",
				a: "Never. All subtitle parsing, timestamp normalization, and WebVTT generation occur entirely inside your browser using client-side TypeScript. Your data never leaves your machine.",
			},
		],
		related: [
			"document/vtt-to-srt",
			"document/sub-to-srt",
			"document/ass-to-srt",
			"document/smi-to-srt",
		],
	},
};
