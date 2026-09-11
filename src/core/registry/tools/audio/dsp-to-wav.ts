import type { Tool } from "../../types";

export const dspToWav: Tool = {
	id: "audio/dsp-to-wav",
	slug: "dsp-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-dsp",
			"audio/dsp",
			"application/x-dsp",
			"application/octet-stream",
		],
		ext: ["dsp"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:dsp-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard 16-bit Linear PCM (.wav)",
				explanation:
					"Decodes Nintendo GameCube and Wii DSP ADPCM audio streams into playable 16-bit linear PCM WAV format.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"DSP to WAV — Convert GameCube & Wii DSP Audio (.dsp) to WAV | convrtr",
		h1: "Convert GameCube & Wii DSP Audio to WAV",
		intent:
			"Convert Nintendo GameCube and Wii DSP ADPCM audio streams, sound effects, and game music directly into playable 16-bit WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a Nintendo DSP file?",
				a: "A DSP file is an audio container used across Nintendo GameCube and Wii video games (such as Super Smash Bros Melee, Mario Kart Double Dash, Zelda Twilight Princess, and Metroid Prime). It encodes 4-bit ADPCM audio with custom 16-bit linear prediction coefficients.",
			},
			{
				q: "Why convert DSP to WAV?",
				a: "Standard media players, digital audio workstations (DAWs), video editors, and game modding tools cannot natively decode GameCube or Wii DSP audio streams. Converting to standard 16-bit RIFF WAV makes them universally playable on any device.",
			},
			{
				q: "How does the decoder work?",
				a: "convrtr reads the 96-byte big-endian DSP header, extracts the 16 prediction filter coefficients, unpacks the 4-bit nibbles across 8-byte frames, and generates a standard 16-bit PCM WAV file.",
			},
			{
				q: "Are files uploaded to an external server?",
				a: "Never. All DSP ADPCM decoding happens strictly in your browser using pure client-side TypeScript. Your game audio remains completely private.",
			},
		],
		related: [
			"audio/8svx-to-wav",
			"audio/adx-to-wav",
			"audio/voc-to-wav",
			"audio/mod-to-wav",
		],
	},
};
