import type { Tool } from "../../types";

export const smiToSrt: Tool = {
	id: "document/smi-to-srt",
	slug: "smi-to-srt",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/x-sami",
			"text/x-sami",
			"application/sami",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["smi", "sami"],
	},
	output: { ext: "srt", mime: "text/plain" },
	engines: ["extract:smi-to-srt"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Universal SubRip (.srt) Subtitles",
				explanation:
					"Converts Microsoft SAMI (.smi) subtitles into universally supported SubRip (.srt) format. Automatically detects Korean EUC-KR / CP949 and UTF-8 encodings, accurately calculates cue durations from blank sync closures, strips superfluous HTML tags while retaining italics/bold, and parses multi-language tracks.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SMI to SRT — Convert SAMI (.smi) Subtitles to SubRip (.srt) Online | convrtr",
		h1: "Convert SAMI (.smi) Subtitles to SRT",
		intent:
			"Convert legacy SAMI (.smi) subtitles (common in Korean dramas, anime, and media archives) into clean SubRip (.srt) files for Plex, VLC, Apple TV, and modern Smart TVs with zero server uploads.",
		faq: [
			{
				q: "Why can't my Smart TV or Plex play .smi subtitle files?",
				a: "SAMI (Synchronized Accessible Media Interchange) was designed by Microsoft in 1998 for Windows Media Player. It uses HTML-like markup with CSS and <SYNC> tags. Modern media players like Plex, Jellyfin, Infuse, and TV operating systems (LG webOS, Samsung Tizen, Apple TV) do not support SAMI or display broken HTML tags instead of subtitles.",
			},
			{
				q: "How does convrtr handle Korean characters without garbled symbols (mojibake)?",
				a: "Many older Korean subtitles were authored in Windows CP949 or EUC-KR encoding rather than UTF-8. convrtr automatically detects the character encoding—inspecting UTF-8, UTF-16, and Korean EUC-KR byte sequences—to ensure pristine Hangul display without corrupted question marks or random symbols.",
			},
			{
				q: "What happens if a .smi file contains both Korean and English subtitles?",
				a: "In bilingual SAMI files (e.g. KRCC and ENCC classes), convrtr parses each synchronized language track and synchronizes them cleanly so both dialogues are preserved chronologically without overlapping conflicts.",
			},
			{
				q: "How does the converter calculate when a subtitle should disappear?",
				a: "In the SAMI specification, subtitles do not have an explicit end duration tag; instead, they are closed when a subsequent <SYNC> tag contains an empty paragraph or &nbsp;. convrtr respects these synchronization boundaries to ensure subtitles do not freeze or linger on screen.",
			},
			{
				q: "Are my subtitle files uploaded to an external server?",
				a: "No. All text parsing, character decoding, and SubRip SRT formatting are executed 100% in-browser using Web Standards. Your video files and subtitles remain entirely private on your device.",
			},
		],
		related: ["document/vcf-to-csv", "document/vnt-to-txt"],
	},
};
