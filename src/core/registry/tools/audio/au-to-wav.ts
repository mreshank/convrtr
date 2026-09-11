import type { Tool } from "../../types";

export const auToWav: Tool = {
	id: "audio/au-to-wav",
	slug: "au-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/basic",
			"audio/x-au",
			"audio/au",
			"audio/snd",
			"application/octet-stream",
		],
		ext: ["au", "snd"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:au-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decodes vintage Sun Microsystems and NeXT (.au / .snd) audio files, G.711 mu-law, A-law, and Big-Endian PCM into standard 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "AU to WAV — Convert Sun / NeXT (.au / .snd) Audio to WAV | convrtr",
		h1: "Convert Sun Microsystems AU to WAV",
		intent:
			"Convert vintage Sun Microsystems and NeXT (.au, .snd) audio files, early web sounds, and telecom recordings into universally playable 16-bit linear PCM WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an AU / SND file?",
				a: "The AU audio format was introduced by Sun Microsystems for SunOS and popularized on NeXT computers and early Mosaic/Netscape web pages. It commonly uses G.711 mu-law or Big-Endian linear PCM.",
			},
			{
				q: "Why convert AU to WAV?",
				a: "Many contemporary media players, mobile browsers, and DAWs no longer support raw AU/SND headers or mu-law decompression. Converting to 16-bit RIFF WAV makes the audio universally playable.",
			},
			{
				q: "Which AU audio encodings are supported?",
				a: "convrtr supports 8-bit G.711 mu-law, 8-bit G.711 A-law, 8-bit signed PCM, 16-bit/24-bit/32-bit Big-Endian PCM, and 32-bit IEEE float, preserving original sample rates and channel layouts.",
			},
			{
				q: "Are my audio files uploaded to a remote server?",
				a: "Never. All sample decompression and RIFF WAV formatting happen 100% locally in your browser memory.",
			},
		],
		related: ["audio/voc-to-wav", "audio/silk-to-wav", "audio/adx-to-wav"],
	},
};
