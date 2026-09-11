import type { Tool } from "../../types";

export const audToWav: Tool = {
	id: "audio/aud-to-wav",
	slug: "aud-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-westwood-aud",
			"audio/x-aud",
			"audio/aud",
			"application/x-aud",
			"application/octet-stream",
		],
		ext: ["aud"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:aud-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 16-bit Linear PCM (.wav)",
				explanation:
					"Decodes Westwood Studios WS-ADPCM / IMA-ADPCM audio streams into playable 16-bit linear PCM WAV format at native sample rate.",
				params: { sampleRate: "0" },
			},
			{
				id: "visually-lossless",
				label: "44.1 kHz WAV (.wav)",
				explanation:
					"Decodes audio stream and sets sample rate to standard 44.1 kHz CD audio rate for universal player playback.",
				params: { sampleRate: "44100" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "sampleRate",
				label: "Output Sample Rate",
				group: "Playback",
				default: "0",
				options: [
					{ value: "0", label: "Auto (Native Header Rate, e.g. 22050 Hz)" },
					{ value: "22050", label: "22,050 Hz (Classic C&C Speech)" },
					{ value: "44100", label: "44,100 Hz (Standard CD Audio)" },
				],
			},
		],
	},
	seo: {
		title:
			"Westwood AUD to WAV — Convert Command & Conquer AUD Audio (.aud) to WAV | convrtr",
		h1: "Convert Westwood Studios AUD (.aud) to WAV",
		intent:
			"Convert Westwood Studios audio streams, unit voice lines, and sound effects (.aud) from Command & Conquer, Red Alert, and Dune 2000 into standard 16-bit linear PCM WAV directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is a Westwood Studios AUD (.aud) audio file?",
				a: "The AUD format is a proprietary compressed audio container developed by Westwood Studios in the 1990s. It was used to store sound effects, iconic unit voice lines (such as 'Unit ready', 'Affirmative', 'Construction complete'), and cinematic soundtracks across their real-time strategy titles.",
			},
			{
				q: "Which games used the Westwood AUD format?",
				a: "AUD files were used in Command & Conquer (Tiberian Dawn), Command & Conquer: Red Alert, Dune II: Building of a Dynasty, Dune 2000, Lands of Lore: Guardians of Destiny, and Tiberian Sun.",
			},
			{
				q: "Why convert Westwood AUD to WAV?",
				a: "Modern operating systems and digital audio workstations cannot parse Westwood ADPCM chunk streams natively. Converting AUD to 16-bit linear PCM WAV allows sound designers, game modders, and nostalgia enthusiasts to listen, sample, and preserve vintage video game audio on modern platforms.",
			},
			{
				q: "Are my retro gaming audio files uploaded to a remote server?",
				a: "Never. All audio decoding and WAV synthesis run 100% locally in your browser memory using pure TypeScript. No audio files or data are ever transmitted over the network.",
			},
		],
		related: [
			"audio/vag-to-wav",
			"audio/dsp-to-wav",
			"audio/adx-to-wav",
			"audio/8svx-to-wav",
		],
	},
};
