import type { Tool } from "../../types";

export const cafToWav: Tool = {
	id: "audio/caf-to-wav",
	slug: "caf-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-caf",
			"audio/caf",
			"application/x-caf",
			"application/octet-stream",
		],
		ext: ["caf"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:caf-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decodes Apple Core Audio Format (.caf) linear PCM audio into standard 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CAF to WAV — Convert Apple Core Audio (.caf) to WAV Online | convrtr",
		h1: "Convert Apple Core Audio (CAF) to WAV",
		intent:
			"Convert Apple Core Audio Format files (.caf) from iPhone voice memos, GarageBand, Logic Pro, and macOS sound loops into universally compatible 16-bit linear PCM WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an Apple CAF (.caf) file?",
				a: "CAF (Core Audio Format) is Apple's 64-bit audio container designed to overcome the legacy 4GB file size limits of RIFF WAV and AIFF. It is widely used by iOS for voice memos, voicemail recordings, GarageBand loops, and Logic Pro studio sessions.",
			},
			{
				q: "Why convert CAF to WAV?",
				a: "Most non-Apple operating systems (Windows, Android, Linux), hardware media players, and DAWs (FL Studio, Ableton Live on Windows) cannot open or play .caf audio recordings. Converting to RIFF WAV makes your recordings playable anywhere.",
			},
			{
				q: "Which CAF audio formats are supported?",
				a: "convrtr decodes Apple Linear PCM ('lpcm') chunks, including 8-bit, 16-bit, 24-bit, and 32-bit floating-point samples across both Little-Endian and Big-Endian byte orders.",
			},
			{
				q: "Are my personal voice memos uploaded to any server?",
				a: "Never. All 64-bit chunk parsing, PCM sample conversion, and RIFF synthesis execute 100% locally in your browser memory.",
			},
		],
		related: [
			"audio/aiff-to-wav",
			"audio/au-to-wav",
			"audio/ircam-to-wav",
			"audio/voc-to-wav",
		],
	},
};
