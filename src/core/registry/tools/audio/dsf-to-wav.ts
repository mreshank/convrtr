import type { Tool } from "../../types";

export const dsfToWav: Tool = {
	id: "audio/dsf-to-wav",
	slug: "dsf-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-dsf",
			"audio/dsf",
			"audio/x-dsd",
			"audio/dsd",
			"application/octet-stream",
		],
		ext: ["dsf"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:dsf-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decimates Sony Direct Stream Digital (.dsf) 1-bit high-resolution SACD audio into universal 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "DSF to WAV — Convert Sony DSD (.dsf) Audio to WAV | convrtr",
		h1: "Convert Sony DSF / DSD Audio to WAV",
		intent:
			"Convert Sony Direct Stream Digital (.dsf) high-resolution SACD audio files into standard uncompressed RIFF WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a Sony DSF (.dsf) file?",
				a: "DSF (DSD Stream File) is an audiophile audio container developed by Sony for Direct Stream Digital (DSD) sound. Used on Super Audio CD (SACD) and high-resolution music downloads, it records sound using 1-bit delta-sigma pulse-density modulation at 2.8224 MHz (DSD64, 64 times the CD audio rate) or 5.6448 MHz (DSD128).",
			},
			{
				q: "How does convrtr convert 1-bit DSD to WAV?",
				a: "Standard audio DACs and media players cannot process 1-bit delta-sigma streams directly without dedicated DSD hardware. convrtr filters and decimates the high-frequency 1-bit bitstream using in-browser windowed FIR filtering, transforming pulse density into clean 16-bit linear PCM at 44.1 kHz packaged into a standard RIFF WAVE container.",
			},
			{
				q: "Why convert DSF to WAV?",
				a: "Most operating systems (macOS, iOS, Windows, Android), standard media players, and DAWs (Ableton, Logic Pro, FL Studio) cannot open or play raw DSF files. Converting to WAV makes your master SACD recordings playable across all digital devices and software.",
			},
			{
				q: "Are my high-resolution audio files uploaded to any server?",
				a: "Never. All chunk parsing, multi-channel demuxing, 1-bit bitstream decimation, and RIFF synthesis are executed entirely client-side in your browser memory.",
			},
		],
		related: [
			"audio/aiff-to-wav",
			"audio/ircam-to-wav",
			"audio/au-to-wav",
			"audio/voc-to-wav",
		],
	},
};
