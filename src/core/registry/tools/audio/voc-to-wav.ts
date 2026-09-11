import type { Tool } from "../../types";

export const vocToWav: Tool = {
	id: "audio/voc-to-wav",
	slug: "voc-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-voc",
			"audio/voc",
			"application/x-voc",
			"application/octet-stream",
		],
		ext: ["voc"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:voc-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decodes vintage Sound Blaster Creative Voice (.voc) audio files, 8-bit unsigned PCM samples, and 16-bit sound blocks into standard universal 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"VOC to WAV — Convert Sound Blaster Creative Voice (.voc) to WAV | convrtr",
		h1: "Convert Creative Voice VOC to WAV",
		intent:
			"Convert vintage Sound Blaster Creative Voice (.voc) retro DOS game sound effects, digitized speech, and chiptune samples into universal playable WAV audio in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a Creative Voice (.voc) file?",
				a: "The VOC format was introduced by Creative Technology with the Sound Blaster audio card for MS-DOS computers in the late 1980s. It became the dominant digitized audio format for PC games like Wolfenstein 3D and LucasArts adventures.",
			},
			{
				q: "Why can't modern media players play VOC files?",
				a: "Modern operating systems and media players have dropped native support for vintage Creative Voice chunk streams. Converting to uncompressed RIFF WAV restores 100% universal compatibility.",
			},
			{
				q: "Does this converter support both 8-bit and 16-bit VOC audio?",
				a: "Yes! convrtr reconstructs sample rates from time constants, decodes standard 8-bit unsigned PCM blocks as well as extended Block 0x09 16-bit PCM blocks, and outputs high-fidelity 16-bit linear PCM WAV.",
			},
			{
				q: "Are my retro sound files uploaded to any cloud server?",
				a: "Never. All audio parsing and WAV generation happen 100% locally in your browser memory.",
			},
		],
		related: ["audio/adx-to-wav", "audio/sf2-to-wav", "audio/silk-to-wav"],
	},
};
