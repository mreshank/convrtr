import type { Tool } from "../../types";

export const rolToWav: Tool = {
	id: "audio/rol-to-wav",
	slug: "rol-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-rol",
			"audio/rol",
			"application/x-rol",
			"application/octet-stream",
		],
		ext: ["rol"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:rol-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard AdLib (120 BPM)",
				explanation:
					"Synthesizes AdLib Visual Composer songs at the nominal 120 BPM tempo with 44.1 kHz 16-bit stereo fidelity.",
				params: { tempo: 120, sampleRate: 44100 },
			},
			{
				id: "hires",
				label: "Studio Master (48 kHz)",
				explanation:
					"High-resolution 48 kHz FM synthesis rendering with full 9-channel stereo panning.",
				params: { tempo: 120, sampleRate: 48000 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "tempo",
				label: "Playback Tempo (BPM)",
				group: "Playback",
				min: 40,
				max: 240,
				step: 1,
				default: 120,
			},
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
		],
	},
	seo: {
		title: "ROL to WAV — Convert AdLib Visual Composer ROL to WAV Online | convrtr",
		h1: "Convert AdLib Visual Composer (.rol) to WAV",
		intent:
			"Synthesize and convert vintage AdLib Visual Composer (.rol) music files from 1980s and 1990s MS-DOS multimedia applications into studio-quality 16-bit stereo WAV audio directly in your browser. Pure Yamaha YM3812 OPL2 FM synthesis 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is an AdLib Visual Composer (.rol) file?",
				a: "ROL is the sequence song format produced by AdLib Inc.'s Visual Composer, the pioneering composition software released in 1987 for the AdLib Music Synthesizer Card on IBM PC compatibles. It stores melodic note tracks destined for the Yamaha YM3812 (OPL2) sound chip.",
			},
			{
				q: "How does convrtr render ROL files to audio?",
				a: "convrtr emulates the 9 melodic channels and 2-operator FM synthesis architecture of the Yamaha YM3812 OPL2 sound chip, generating real-time sine waveforms, carrier-modulator phase modulation, and ADSR envelope curves directly into 16-bit PCM WAV in your browser.",
			},
			{
				q: "Are my retro AdLib files uploaded to a remote server?",
				a: "Never. All note parsing, FM frequency synthesis, and WAV encoding run purely on your device in the client browser with zero network requests.",
			},
		],
		related: [
			"audio/imf-to-wav",
			"audio/hmi-to-wav",
			"audio/rad-to-wav",
			"audio/mod-to-wav",
			"audio/s3m-to-wav",
		],
	},
};
