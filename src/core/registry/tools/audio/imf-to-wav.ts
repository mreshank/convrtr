import type { Tool } from "../../types";

export const imfToWav: Tool = {
	id: "audio/imf-to-wav",
	slug: "imf-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-imf",
			"audio/imf",
			"application/x-imf",
			"application/octet-stream",
		],
		ext: ["imf", "wlf"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:imf-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "wolf3d",
		presets: [
			{
				id: "wolf3d",
				label: "Wolfenstein 3D Clock (560 Hz)",
				explanation:
					"Synthesizes id Software Music Format songs at the standard 560 Hz OPL2 timer tick rate used in Wolfenstein 3D and Spear of Destiny.",
				params: { clockRate: 560, sampleRate: 44100 },
			},
			{
				id: "keen",
				label: "Commander Keen Clock (700 Hz)",
				explanation:
					"Synthesizes id Software Music Format songs at the 700 Hz OPL2 timer tick rate used in Commander Keen 4-6.",
				params: { clockRate: 700, sampleRate: 44100 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "clockRate",
				label: "OPL Timer Clock Rate (Hz)",
				group: "Playback",
				min: 140,
				max: 1120,
				step: 10,
				default: 560,
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
		title: "IMF to WAV — Convert id Software IMF Music to WAV Online | convrtr",
		h1: "Convert id Software Music Format (.imf) to WAV",
		intent:
			"Synthesize and convert classic id Software Music Format soundtrack files (.imf, .wlf) from Commander Keen and Wolfenstein 3D into studio-quality 16-bit 44.1kHz stereo WAV audio directly in your browser. Pure Yamaha OPL2 FM synthesis 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is an id Software Music Format (.imf) file?",
				a: "IMF is the proprietary AdLib/OPL2 music format developed in 1991 by Jason Blochowiak and Bobby Prince for id Software and Apogee games including Commander Keen (4-6), Wolfenstein 3D, Spear of Destiny, Bio Menace, and Blake Stone. It stores raw Yamaha YM3812 register-data pairs alongside timer tick delays.",
			},
			{
				q: "Why do Wolfenstein 3D and Commander Keen songs play at different speeds?",
				a: "The PC timer interrupt frequency differed between games: Wolfenstein 3D ran its music engine at 560 Hz, whereas Commander Keen ran at 700 Hz (and Duke Nukem II at 280 Hz). convrtr provides dedicated presets for both clock rates.",
			},
			{
				q: "Are my retro game soundtrack files sent to external servers?",
				a: "Never. All Yamaha YM3812 OPL2 register emulation, 2-operator FM synthesis, and 16-bit stereo WAV encoding execute locally in your web browser with zero network requests.",
			},
		],
		related: [
			"audio/rad-to-wav",
			"audio/mod-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/mtm-to-wav",
		],
	},
};
