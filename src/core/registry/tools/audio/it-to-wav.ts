import type { Tool } from "../../types";

export const itToWav: Tool = {
	id: "audio/it-to-wav",
	slug: "it-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/it",
			"audio/x-it",
			"application/x-it",
			"application/octet-stream",
		],
		ext: ["it"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:it-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 44.1 kHz Stereo (.wav)",
				explanation:
					"Synthesizes Impulse Tracker 64-channel patterns, sample loops, and C5Speed frequencies into 16-bit linear stereo PCM WAV at 44,100 Hz.",
				params: { sampleRate: "44100", maxDurationSeconds: "180" },
			},
			{
				id: "visually-lossless",
				label: "High-Definition 48 kHz (.wav)",
				explanation:
					"Renders IT tracker audio at 48,000 Hz studio broadcast rate with extended duration headroom.",
				params: { sampleRate: "48000", maxDurationSeconds: "300" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "sampleRate",
				label: "Audio Sample Rate",
				group: "Synthesis",
				default: "44100",
				options: [
					{ value: "44100", label: "44,100 Hz (Standard CD Audio)" },
					{ value: "48000", label: "48,000 Hz (Studio / Video)" },
					{ value: "22050", label: "22,050 Hz (Vintage Retro PC)" },
				],
			},
		],
	},
	seo: {
		title:
			"Impulse Tracker IT to WAV — Convert IT Chiptune Tracker Audio to WAV | convrtr",
		h1: "Convert Impulse Tracker (.it) to WAV",
		intent:
			"Convert Jeffrey Lim's Impulse Tracker (.it) tracker modules into universal 16-bit linear stereo PCM WAV audio directly in your browser. 100% client-side retro chiptune synthesizer.",
		faq: [
			{
				q: "What is an Impulse Tracker (.it) file?",
				a: "The IT (Impulse Tracker) format was created in 1996 by Australian programmer Jeffrey Lim. Widely regarded as the pinnacle of the PC tracker golden era, IT supported up to 64 channels, resonant filters, New Note Actions (NNA), 16-bit compressed samples, and complex envelope modulations.",
			},
			{
				q: "Which classic games used Impulse Tracker IT music?",
				a: "Legendary 1990s and 2000s games including Jazz Jackrabbit 2, Deus Ex, Unreal, Unreal Tournament, and Star Control II (3DO remix) featured prominent soundtracks composed with or rendered from Impulse Tracker modules.",
			},
			{
				q: "Why convert IT files to WAV?",
				a: "Modern operating systems, mobile devices, and DAWs cannot play raw Impulse Tracker modules without specialized plugins or emulators. Converting IT files into standard 16-bit stereo WAV ensures complete playback compatibility across all devices and media players.",
			},
			{
				q: "Is my audio uploaded to external servers?",
				a: "No. All pattern parsing, frequency calculations, sample looping, and stereo voice synthesis occur 100% inside your browser memory using pure TypeScript and Web standard APIs. Your files never leave your device.",
			},
		],
		related: [
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/mod-to-wav",
			"audio/8svx-to-wav",
		],
	},
};
