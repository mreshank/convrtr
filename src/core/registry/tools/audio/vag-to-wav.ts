import type { Tool } from "../../types";

export const vagToWav: Tool = {
	id: "audio/vag-to-wav",
	slug: "vag-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-psx-vag",
			"audio/x-vag",
			"audio/vag",
			"application/x-vag",
			"application/octet-stream",
		],
		ext: ["vag", "vagp"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:vag-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard 16-bit Linear PCM (.wav)",
				explanation:
					"Decodes Sony PlayStation 1 SPU-ADPCM audio streams into playable 16-bit linear PCM WAV format with original dynamics preserved.",
				params: { normalize: false },
			},
			{
				id: "visually-lossless",
				label: "Normalized 16-bit PCM (.wav)",
				explanation:
					"Decodes and normalizes audio amplitude to modern listening volume levels (-0.5 dBFS).",
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
			"PSX VAG to WAV — Convert PlayStation VAG Audio (.vag) to WAV | convrtr",
		h1: "Convert PlayStation VAG Audio (.vag) to WAV",
		intent:
			"Convert Sony PlayStation 1 & 2 PSX SPU-ADPCM audio streams, sound effects, and voice clips (.vag, .vagp) into standard 16-bit linear PCM WAV directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is a PlayStation VAG (.vag) audio file?",
				a: "The VAG format is Sony's proprietary compressed sound effect and voice stream container used across PlayStation 1 and PlayStation 2 games (including Final Fantasy VII, Metal Gear Solid, Crash Bandicoot, and Resident Evil). It stores 4-bit SPU-ADPCM audio organized in 16-byte blocks with a 48-byte or 64-byte 'VAGp' header.",
			},
			{
				q: "Why convert VAG to WAV?",
				a: "Modern operating systems, DAWs, and media players cannot decode Sony SPU-ADPCM audio streams natively. Converting to standard 16-bit linear PCM RIFF WAV allows game modders, audio designers, and preservationists to listen, edit, and archive classic PS1 audio on any device.",
			},
			{
				q: "How does the in-browser VAG decoder work?",
				a: "convrtr reads the 'VAGp' header to extract the sample rate and sound title, then iterates through each 16-byte block, calculating predicted samples using the authentic 5-coefficient 2-pole Sony SPU IIR filter and wrapping the output in a 44-byte RIFF WAVE container.",
			},
			{
				q: "Are my retro gaming audio files uploaded to a remote server?",
				a: "Never. All audio decoding and WAV synthesis run 100% locally in your browser memory using pure TypeScript. No data is ever transmitted over the network.",
			},
		],
		related: [
			"image/tim-to-png",
			"audio/dsp-to-wav",
			"audio/adx-to-wav",
			"audio/8svx-to-wav",
		],
	},
};
