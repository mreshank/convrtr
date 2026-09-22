import type { Tool } from "../../types";

export const sccToSrt: Tool = {
	id: "document/scc-to-srt",
	slug: "scc-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/x-scc", "application/octet-stream"],
		ext: ["scc"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:scc-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "srt",
		presets: [
			{
				id: "srt",
				label: "SubRip Subtitle (.srt)",
				explanation:
					"Converts EIA-608 Line 21 closed captions to universal SubRip SRT subtitles with accurate millisecond timing.",
				params: { vtt: false },
			},
			{
				id: "vtt",
				label: "WebVTT Subtitle (.vtt)",
				explanation:
					"Converts broadcast captions to HTML5 WebVTT format for modern web video players and streaming delivery.",
				params: { vtt: true },
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SCC to SRT — Convert Scenarist Closed Caption to Subtitles | convrtr",
		h1: "Convert Scenarist SCC Closed Captions to SRT",
		intent:
			"Convert Scenarist Closed Caption (.scc) broadcast CEA-608 files into standard SubRip SRT and WebVTT subtitles directly in your browser. Compatible with Amazon Prime Video, Netflix, Premiere Pro, DaVinci Resolve, and VLC.",
		faq: [
			{
				q: "What is an .scc file?",
				a: "An .scc file (Scenarist Closed Caption) is the television broadcast industry standard format storing CEA-608 / EIA-608 Line 21 closed captions in SMPTE timecoded hexadecimal word pairs.",
			},
			{
				q: "Does this handle drop-frame timecodes?",
				a: "Yes. Both 29.97 fps drop-frame timecodes (marked with semicolons) and standard non-drop timecodes are accurately calculated to exact millisecond intervals.",
			},
			{
				q: "Are musical notes and special characters supported?",
				a: "Yes. CEA-608 special character codes such as musical notes (♪), Spanish inverted punctuation, accented vowels, and trademark symbols are cleanly decoded into UTF-8 text.",
			},
			{
				q: "Are my caption files uploaded to a server?",
				a: "No. Conversion executes 100% locally in your web browser. Confidential broadcast scripts and unreleased film dialog never leave your computer.",
			},
		],
		related: [
			"document/srt-to-vtt",
			"document/vtt-to-srt",
			"document/ass-to-srt",
		],
	},
};
