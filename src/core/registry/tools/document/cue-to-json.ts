import type { Tool } from "../../types";

export const cueToJson: Tool = {
	id: "document/cue-to-json",
	slug: "cue-to-json",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-cue", "text/plain", "application/octet-stream"],
		ext: ["cue"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:cue-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Structured JSON Tracklist",
				explanation:
					"Parses CUE sheet CD-DA disc image layouts, album metadata, artists, ISRCs, pregap/postgap markers, and converts 75 fps CD audio frames into high-precision milliseconds.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CUE to JSON — Parse CD Audio CUE Sheets to Structured JSON | convrtr",
		h1: "Convert CUE Sheet to Structured JSON",
		intent:
			"Convert CUE sheet (.cue) CD-DA audio tracklists, disc images, and chapter metadata into clean, structured JSON with calculated millisecond timestamps in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a CUE sheet (.cue) file?",
				a: "A CUE sheet is a plain-text metadata file defining how tracks on a compact disc (CD-DA) or disc image (BIN, FLAC, WAV, APE) are laid out, including track durations, pregaps, performers, and titles.",
			},
			{
				q: "How does convrtr translate CD audio timestamps?",
				a: "Compact Disc Digital Audio uses a timecode format of MM:SS:FF where FF represents frames at 75 sectors per second. convrtr calculates the exact sector frame count and translates each index mark into precise seconds and milliseconds.",
			},
			{
				q: "Does this parser support multi-file CUE sheets and ISRCs?",
				a: "Yes! convrtr parses multi-file references, CATALOG barcodes, ISRC codes, CD-Text data, REM metadata comments, and multiple INDEX positions (such as INDEX 00 pregaps).",
			},
			{
				q: "Are my audio disc metadata files uploaded to any server?",
				a: "Never. All text parsing and JSON generation run entirely inside your browser memory with zero network requests.",
			},
		],
		related: [
			"document/smi-to-srt",
			"document/sub-to-srt",
			"document/ass-to-srt",
		],
	},
};
