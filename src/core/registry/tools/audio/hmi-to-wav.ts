import type { Tool } from "../../types";

export const hmiToWav: Tool = {
	id: "audio/hmi-to-wav",
	slug: "hmi-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-hmi",
			"audio/hmi",
			"application/x-hmi",
			"application/octet-stream",
		],
		ext: ["hmi", "hmp"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:hmi-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "CD Audio (44.1 kHz, 16-bit)",
				explanation:
					"Synthesizes Human Machine Interfaces (HMI) game soundtrack sequence into uncompressed 16-bit 44.1 kHz stereo linear PCM WAV.",
				params: { sampleRate: 44100, tempo: 120 },
			},
			{
				id: "fm",
				label: "Retro FM (22.05 kHz)",
				explanation:
					"Synthesizes HMI game audio at retro 22.05 kHz sample rate recreating authentic 1990s Sound Blaster 16 playback.",
				params: { sampleRate: 22050, tempo: 120 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "sampleRate",
				label: "Output Sample Rate (Hz)",
				group: "Synthesis",
				min: 11025,
				max: 48000,
				step: 100,
				default: 44100,
			},
			{
				control: "stepper",
				key: "tempo",
				label: "Playback Tempo (BPM)",
				group: "Timing",
				min: 40,
				max: 240,
				step: 5,
				default: 120,
			},
		],
	},
	seo: {
		title:
			"HMI to WAV — Convert Human Machine Interfaces MIDI to WAV Online | convrtr",
		h1: "Convert Human Machine Interfaces (.hmi) to WAV",
		intent:
			"Synthesize and convert classic Human Machine Interfaces MIDI music files (.hmi, .hmp) from 1990s MS-DOS games like Descent, Warcraft II, and Duke Nukem 3D into studio-quality 16-bit stereo WAV audio directly in your browser. Pure client-side offline execution with zero server uploads.",
		faq: [
			{
				q: "What is a Human Machine Interfaces (.hmi) file?",
				a: "HMI is an extended MIDI container format created by Human Machine Interfaces, Inc. in the early 1990s. Widely licensed across MS-DOS PC gaming (e.g. Descent, Descent II, Warcraft II, Mortal Kombat, Anvil of Dawn, Shattered Steel), it encapsulated multi-track MIDI sequences, custom patch assignments, and timing divisions for sound drivers like Sound Blaster, Roland RAP-10, and Gravis UltraSound.",
			},
			{
				q: "How does convrtr synthesize HMI files?",
				a: "convrtr parses the HMI container headers, extracts note and control change event streams across all 16 MIDI channels, and renders multi-voice harmonic synthesis directly to standard 16-bit linear PCM WAV in browser memory.",
			},
			{
				q: "Are my retro game soundtrack files uploaded to external servers?",
				a: "No. All binary decoding, event timeline scheduling, and WAV sample synthesis occur 100% locally inside your browser sandbox with zero network requests.",
			},
		],
		related: [
			"audio/imf-to-wav",
			"audio/rad-to-wav",
			"audio/mod-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
		],
	},
};
