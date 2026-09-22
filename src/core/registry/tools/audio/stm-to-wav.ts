import type { Tool } from "../../types";

export const stmToWav: Tool = {
	id: "audio/stm-to-wav",
	slug: "stm-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: ["audio/x-stm", "application/x-stm", "application/octet-stream"],
		ext: ["stm"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:stm-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 44.1 kHz Stereo (.wav)",
				explanation:
					"Synthesizes Scream Tracker 2 patterns, looped 8-bit samples and core effects (volume/pitch slides, portamento, vibrato, tremor, arpeggio) into pristine 16-bit stereo PCM WAV at 44,100 Hz.",
				params: { sampleRate: "44100" },
			},
			{
				id: "visually-lossless",
				label: "High-Definition 48 kHz (.wav)",
				explanation:
					"Renders STM tracker audio at 48,000 Hz studio broadcast rate.",
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
		title:
			"STM to WAV — Convert Scream Tracker 2 Audio (.stm) to WAV | convrtr",
		h1: "Convert Scream Tracker 2 Module (.stm) to WAV",
		intent:
			"Convert Scream Tracker 2 module music (.stm) — Future Crew's 1990 precursor to the PC tracking scene — into universal 16-bit linear stereo PCM WAV directly in your browser. 100% private in-browser chiptune synthesizer.",
		faq: [
			{
				q: "What is an .stm file?",
				a: "The module format of Scream Tracker 2 (1990): 4 channels of sample-based sequencing that launched PC tracked music. Version 3 moved to .s3m — this tool covers the original STM v2 modules with internal samples.",
			},
			{
				q: "Will it sound like the original?",
				a: "Faithfully: looped 8-bit samples, compound tempo, and effects A–K/O render per ST2 semantics (L/M/N were never implemented in ST2 itself and are skipped, exactly as the tracker does). ST2 was mono, so output is dual-mono stereo.",
			},
			{
				q: "My file won't convert — why?",
				a: "Two honest refusals: .sts songs keep samples in external files (nothing to synthesize without them), and v1 files predate the stable format. Both fail with a message naming the cause.",
			},
			{
				q: "Is my file uploaded anywhere?",
				a: "No. Pattern parsing and synthesis run entirely inside your browser.",
			},
		],
		related: ["audio/s3m-to-wav", "audio/xm-to-wav", "audio/mod-to-wav"],
	},
};
