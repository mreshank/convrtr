import type { Tool } from "../../types";

export const xmiToWav: Tool = {
	id: "audio/xmi-to-wav",
	slug: "xmi-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-xmi",
			"audio/xmi",
			"application/x-xmi",
			"application/octet-stream",
		],
		ext: ["xmi"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:xmi-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "standard",
		presets: [
			{
				id: "standard",
				label: "Standard Game Audio (120 BPM)",
				explanation:
					"Synthesizes Miles Sound System Extended MIDI tracks at standard 120 BPM tempo with 44.1 kHz 16-bit stereo fidelity.",
				params: { tempo: 120, sampleRate: 44100 },
			},
			{
				id: "hires",
				label: "Studio Master (48 kHz)",
				explanation:
					"High-resolution 48 kHz multi-harmonic voice rendering with full stereo panning.",
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
		title:
			"XMI to WAV — Convert Miles Sound System XMI Music to WAV Online | convrtr",
		h1: "Convert Miles Sound System Extended MIDI (.xmi) to WAV",
		intent:
			"Synthesize and convert vintage Miles Sound System Extended MIDI (.xmi) soundtrack files from classic 1990s MS-DOS games into studio-quality 16-bit stereo WAV audio directly in your browser. Pure client-side synthesis 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Miles Sound System Extended MIDI (.xmi) file?",
				a: "XMI (XMID) is an extended MIDI sequence format created by John Miles as part of the Miles Sound System (MSS) and Audio Interface Library (AIL). Used across hundreds of landmark MS-DOS games from Sierra, LucasArts, Origin, and BioWare (including Wing Commander, Ultima, Theme Park, and Warcraft), it encapsulates multi-track MIDI events with delta time intervals and note durations inside an IFF container.",
			},
			{
				q: "How does convrtr synthesize XMI soundtrack files?",
				a: "convrtr parses the IFF FORM XMID container and EVNT chunk hierarchy, extracts sequence note events and channel controls, generates multi-harmonic synthesizer voices with ADSR amplitude envelopes, and renders the result into standard 16-bit linear PCM stereo WAV audio.",
			},
			{
				q: "Are my game music files sent to an external server?",
				a: "Never. All parsing, voice synthesis, and WAV encoding execute locally inside your browser sandbox. No file data is ever transmitted across the internet.",
			},
		],
		related: [
			"audio/hmi-to-wav",
			"audio/rol-to-wav",
			"audio/imf-to-wav",
			"audio/rad-to-wav",
			"audio/mod-to-wav",
		],
	},
};
