import type { Tool } from "../../types";

export const ircamToWav: Tool = {
	id: "audio/ircam-to-wav",
	slug: "ircam-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-ircam",
			"audio/ircam",
			"sound/ircam",
			"application/octet-stream",
		],
		ext: ["sf", "ircam"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:ircam-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decodes IRCAM / Sound Designer II (.sf, .ircam) academic research audio into universal 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"IRCAM to WAV — Convert IRCAM / BICSF (.sf / .ircam) Audio to WAV | convrtr",
		h1: "Convert IRCAM Sound Files to WAV",
		intent:
			"Convert vintage IRCAM (.sf, .ircam) electroacoustic research sound files, CSound synthesis patches, and NeXT/Sun audio into standard uncompressed RIFF WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an IRCAM (.sf, .ircam) sound file?",
				a: "The IRCAM sound format was developed in the 1980s by the Institut de Recherche et Coordination Acoustique/Musique in Paris for academic computer music research. It is a precursor to modern digital audio workstations, extensively utilized in CSound, Cmusic, AudioSculpt, OpenMusic, and vintage Unix sound synthesis environments.",
			},
			{
				q: "What sample encodings does convrtr support?",
				a: "convrtr decodes 16-bit signed linear PCM, 32-bit signed linear PCM, 32-bit IEEE floating-point, and 8-bit G.711 mu-law audio streams across both Big-Endian (Sun, NeXT, SGI) and Little-Endian (VAX, DEC MIPS, PC) architectures.",
			},
			{
				q: "Why convert IRCAM to WAV?",
				a: "IRCAM sound files cannot be opened by standard media players (QuickTime, Windows Media Player, VLC) or modern DAWs (Ableton Live, FL Studio, Logic Pro) without esoteric command-line tools. Converting to WAV enables seamless playback and editing anywhere.",
			},
			{
				q: "Are my sound files uploaded to any server?",
				a: "Never. All 1024-byte header parsing, endianness correction, float normalization, and RIFF WAVE packaging happen 100% locally in your browser memory.",
			},
		],
		related: ["audio/au-to-wav", "audio/aiff-to-wav", "audio/voc-to-wav"],
	},
};
