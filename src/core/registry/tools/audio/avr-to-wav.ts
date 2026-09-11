import type { Tool } from "../../types";

export const avrToWav: Tool = {
	id: "audio/avr-to-wav",
	slug: "avr-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: ["audio/x-avr", "audio/avr", "application/octet-stream"],
		ext: ["avr"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:avr-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard 16-bit Linear PCM (.wav)",
				explanation:
					"Decodes Atari ST Audio Visual Research (.avr) 8-bit or 16-bit audio samples into playable 16-bit linear PCM WAV format with original dynamics preserved.",
				params: { normalize: false },
			},
			{
				id: "visually-lossless",
				label: "Normalized 16-bit PCM (.wav)",
				explanation:
					"Decodes and normalizes audio amplitude to standard listening volume levels (-0.5 dBFS).",
				params: { normalize: true },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "normalize",
				label: "Normalize Peak Audio Amplitude",
				group: "Audio Processing",
				default: false,
			},
		],
	},
	seo: {
		title:
			"Atari ST AVR to WAV — Convert Audio Visual Research (.avr) to WAV | convrtr",
		h1: "Convert Atari ST AVR Audio (.avr) to WAV",
		intent:
			"Convert vintage Atari ST and Falcon Audio Visual Research audio files (.avr) into standard 16-bit linear PCM WAV directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is an Atari ST AVR (.avr) audio file?",
				a: "The AVR (Audio Visual Research) format was developed in the late 1980s for the Atari ST and Falcon030 computers. Built for professional sound sampling, digital synthesis, and early hard-disk audio recording, AVR files feature a 128-byte header starting with the '2VRH' signature, followed by raw 8-bit or 16-bit big-endian PCM audio samples.",
			},
			{
				q: "Why convert AVR to WAV?",
				a: "Modern operating systems, mobile devices, and digital audio workstations (DAWs) cannot natively open vintage Atari ST audio files. Converting to standard 16-bit linear PCM RIFF WAV allows musicians, sound designers, and retro computer enthusiasts to play, sample, and edit vintage ST recordings on modern systems.",
			},
			{
				q: "Does the converter support 16-bit and stereo AVR files?",
				a: "Yes! convrtr supports both mono and stereo AVR files across 8-bit (signed and unsigned) and 16-bit (big-endian signed and unsigned) sample configurations, automatically converting them into standard little-endian PCM WAV.",
			},
			{
				q: "Are my audio files uploaded to any server?",
				a: "Never. All byte parsing, signedness conversion, big-endian to little-endian transposition, and WAV container encoding execute 100% locally in your browser memory. No audio is ever uploaded.",
			},
		],
		related: [
			"image/degas-to-png",
			"audio/8svx-to-wav",
			"audio/mod-to-wav",
			"audio/au-to-wav",
		],
	},
};
