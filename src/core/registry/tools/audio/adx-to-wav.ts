import type { Tool } from "../../types";

export const adxToWav: Tool = {
	id: "audio/adx-to-wav",
	slug: "adx-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: ["audio/x-adx", "application/octet-stream"],
		ext: ["adx"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:adx-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Exact 16-bit PCM",
				explanation:
					"Decodes 4-bit CRI ADX ADPCM frames using 2-pole linear prediction and outputs uncompressed 16-bit linear PCM WAV audio.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"ADX to WAV — Convert CRIWARE Game Audio to WAV Online Free | convrtr",
		h1: "Convert CRIWARE ADX to WAV",
		intent:
			"Convert CRIWARE ADX game audio tracks (.adx) into standard uncompressed WAV audio directly in your browser. Extract video game soundtrack background music, voice lines, and sound effects from Dreamcast, PS2, GameCube, Wii, and modern Japanese console games with zero server uploads.",
		faq: [
			{
				q: "What is a CRIWARE .adx file?",
				a: "ADX is a proprietary audio compression format developed by CRI Middleware, used extensively across thousands of classic and modern Japanese video games (Sonic Adventure, Persona, Phantasy Star, Shenmue) for voice acting and high-quality soundtrack streaming.",
			},
			{
				q: "How does this decoder work without desktop emulator tools?",
				a: "This tool reconstructs CRIWARE's 2-pole linear prediction filter directly in client-side TypeScript. It unpacks 4-bit differential nibbles, calculates cutoff-frequency coefficients, clamps amplitude, and streams the output into a standard 44-byte RIFF WAV container.",
			},
			{
				q: "Does this handle both mono voice clips and stereo music?",
				a: "Yes. Both 1-channel mono voice clips and 2-channel interleaved stereo background music streams are decoded seamlessly.",
			},
			{
				q: "Are my game audio files sent to a remote server?",
				a: "No. All decompression and WAV synthesis executes 100% locally in your browser memory. Your files never leave your device.",
			},
		],
		related: ["audio/sf2-to-wav", "audio/flac-to-wav"],
	},
};
