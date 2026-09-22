import type { Tool } from "../../types";

export const ultToWav: Tool = {
	id: "audio/ult-to-wav",
	slug: "ult-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: ["audio/x-ult", "application/x-ult", "application/octet-stream"],
		ext: ["ult"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:ult-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 44.1 kHz Stereo (.wav)",
				explanation:
					"Synthesizes UltraTracker dual-command patterns, looped 8/16-bit samples and translated effects (arpeggio, portamento, vibrato, tremolo, retrig) into pristine 16-bit stereo PCM WAV at 44,100 Hz.",
				params: { sampleRate: "44100" },
			},
			{
				id: "visually-lossless",
				label: "High-Definition 48 kHz (.wav)",
				explanation:
					"Renders ULT tracker audio at 48,000 Hz studio broadcast rate.",
				params: { sampleRate: "48000" },
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
		title: "ULT to WAV — Convert UltraTracker Audio (.ult) to WAV | convrtr",
		h1: "Convert UltraTracker Module (.ult) to WAV",
		intent:
			"Convert UltraTracker module music (.ult) into universal 16-bit linear stereo PCM WAV directly in your browser — dual-command patterns, pingpong loops and all. 100% private in-browser chiptune synthesizer.",
		faq: [
			{
				q: "What is an .ult file?",
				a: "The module format of UltraTracker (1990s DOS tracker): up to 32 channels of sample-based sequencing with an unusual dual-effect-column pattern format, documented today mainly through OpenMPT's loader source.",
			},
			{
				q: "Will obscure effects sound right?",
				a: "Core effects (arpeggio, slides, vibrato, tremolo, offset, volume, pan, break, retrig, tempo) render per OpenMPT's translation table. Rarities like backwards play and note delay are ignored openly rather than faked.",
			},
			{
				q: "Is my file uploaded anywhere?",
				a: "No. Pattern parsing and synthesis run entirely inside your browser.",
			},
		],
		related: ["audio/stm-to-wav", "audio/xm-to-wav", "audio/it-to-wav"],
	},
};
