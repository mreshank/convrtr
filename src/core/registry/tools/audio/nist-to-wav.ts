import type { Tool } from "../../types";

export const nistToWav: Tool = {
	id: "audio/nist-to-wav",
	slug: "nist-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-nist",
			"audio/nist",
			"audio/x-sphere",
			"application/octet-stream",
		],
		ext: ["sph", "nist"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:nist-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decodes NIST SPHERE (.sph, .nist) speech database audio into universal 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"NIST to WAV — Convert NIST SPHERE (.sph, .nist) Audio to WAV | convrtr",
		h1: "Convert NIST SPHERE Speech Audio to WAV",
		intent:
			"Convert NIST SPHERE speech recognition corpus files (.sph, .nist) from TIMIT, Switchboard, and DARPA datasets into standard uncompressed RIFF WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a NIST SPHERE (.sph, .nist) file?",
				a: "NIST SPHERE (SPeech HEader REsources) is an audio file format standard created by the US National Institute of Standards and Technology (NIST) for acoustic and speech recognition research. It is the core format for landmark research speech corpora including DARPA TIMIT, CSR (Wall Street Journal), Switchboard, and NIST Speaker Recognition Evaluations.",
			},
			{
				q: "What sample encodings and architectures are supported?",
				a: "convrtr supports linear PCM (16-bit signed, 8-bit unsigned), 8-bit G.711 mu-law (ulaw), and A-law encodings across both Big-Endian ('10' - Sparc/SGI) and Little-Endian ('01' - x86/Alpha) byte order representations.",
			},
			{
				q: "Why convert NIST SPHERE to WAV?",
				a: "Modern web browsers, machine learning audio loaders (Torchaudio, Librosa, Hugging Face Datasets), and media players cannot natively play NIST SPHERE files without legacy utilities like sph2pipe or sox. Converting to standard RIFF WAV makes speech corpora instantly accessible.",
			},
			{
				q: "Are my audio files uploaded to any server?",
				a: "Never. All 1024-byte SPHERE ASCII text header parsing, endianness alignment, mu-law expansion, and WAV container packaging run entirely in-browser using WebAssembly and pure TypeScript.",
			},
		],
		related: [
			"audio/ircam-to-wav",
			"audio/au-to-wav",
			"audio/aiff-to-wav",
			"audio/voc-to-wav",
		],
	},
};
