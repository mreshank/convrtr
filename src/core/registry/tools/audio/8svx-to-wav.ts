import type { Tool } from "../../types";

export const eightSvxToWav: Tool = {
	id: "audio/8svx-to-wav",
	slug: "8svx-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-8svx",
			"audio/8svx",
			"audio/x-iff",
			"audio/iff",
			"application/octet-stream",
		],
		ext: ["8svx", "svx", "iff"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:8svx-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard 16-bit Linear PCM (.wav)",
				explanation:
					"Decodes Commodore Amiga 8SVX audio samples and Fibonacci-delta compressed speech into universal 16-bit linear PCM WAV format.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "8SVX to WAV — Convert Amiga IFF 8SVX Audio to WAV | convrtr",
		h1: "Convert Amiga IFF 8SVX Audio to WAV",
		intent:
			"Convert Commodore Amiga IFF 8SVX audio samples, sound effects, and Fibonacci-delta compressed speech directly into playable 16-bit PCM WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an 8SVX file?",
				a: "8SVX (8-Bit Sampled Voice) is the standard digital audio sub-format of Electronic Arts' Interchange File Format (EA IFF 85), created for the Commodore Amiga personal computer. It was widely used in Amiga games, music trackers (Tracker, SoundTracker), and early multimedia software.",
			},
			{
				q: "Why convert 8SVX to WAV?",
				a: "Modern operating systems, DAWs (Ableton Live, FL Studio, Logic Pro), audio editors (Audacity), and media players cannot open Amiga IFF 8SVX audio files natively. Converting to WAV makes classic Amiga samples instantly playable and editable.",
			},
			{
				q: "How does convrtr handle Amiga compression?",
				a: "convrtr decodes both uncompressed 8-bit signed linear PCM and proprietary Amiga 4-bit Fibonacci-delta compression tables, scaling samples to clean 16-bit PCM and wrapping them in standard RIFF WAVE headers.",
			},
			{
				q: "Are my audio files uploaded anywhere?",
				a: "Never. All IFF chunk traversal, Fibonacci decompression, and WAV compilation execute 100% locally inside your web browser. Zero bytes leave your machine.",
			},
		],
		related: [
			"audio/mod-to-wav",
			"audio/voc-to-wav",
			"audio/au-to-wav",
			"audio/aiff-to-wav",
		],
	},
};
