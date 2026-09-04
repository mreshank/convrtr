import type { Tool } from "../../types";

export const wavToMp3: Tool = {
	id: "audio/wav-to-mp3",
	slug: "wav-to-mp3",
	category: "audio",
	kind: "convert",
	accept: { mime: ["audio/wav", "audio/x-wav", "audio/wave"], ext: ["wav"] },
	output: { ext: "mp3", mime: "audio/mpeg" },
	engines: ["mp3:encode"],
	quality: {
		// MP3 has no lossless mode. Claiming otherwise anywhere in this file
		// would undermine every honest lossless claim the catalogue makes.
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "visually-lossless",
				label: "Best quality",
				explanation:
					"320kbps, the highest MP3 supports. Very hard to tell from the original on most material, though audio is still being discarded.",
				params: { bitrate: 320 },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"192kbps. The usual choice for music you intend to listen to rather than edit — roughly a seventh of the WAV's size.",
				params: { bitrate: 192 },
			},
			{
				id: "smallest",
				label: "Smallest file",
				explanation:
					"128kbps. Noticeably softer on cymbals and applause, but small and playable anywhere.",
				params: { bitrate: 128 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "bitrate",
				label: "Bitrate (kbps)",
				group: "Encoder",
				min: 64,
				max: 320,
				step: 32,
				default: 192,
			},
		],
	},
	seo: {
		title: "Convert WAV to MP3 — free, private, in your browser | convrtr",
		h1: "Convert WAV to MP3",
		intent:
			"Convert WAV files to MP3 without uploading them. Choose the bitrate, and convrtr encodes on your device — the audio never leaves your computer.",
		faq: [
			{
				q: "Does converting to MP3 lose quality?",
				a: "Yes, permanently, and no setting avoids it — that is what MP3 is for. It analyses the audio and throws away what it predicts you are least likely to notice, which is how it reaches a seventh of the size. The bitrate chooses how much it discards, not whether it does. If you wanted a smaller file with nothing lost, FLAC is the honest answer: about half the size of WAV, and every sample preserved.",
			},
			{
				q: "Which bitrate should I choose?",
				a: "192kbps is a sensible default for listening. 320kbps is very hard to distinguish from the original on most material and is worth it if the file will be re-encoded later or played on good equipment. 128kbps is noticeably softer on cymbals, applause and other dense high-frequency sound, but is small and plays anywhere. None of them is reversible, so keep the WAV if the audio still matters.",
			},
			{
				q: "Why was my file refused for its sample rate?",
				a: "MP3 can only store a fixed set of sample rates, and high-resolution audio at 88.2 or 96kHz is not among them. Converting would mean resampling, which alters every sample by interpolation on top of the codec's own loss — so convrtr refuses rather than doing that silently. FLAC stores those rates exactly.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while converting — or by going offline first.",
			},
		],
		related: ["audio/wav-to-flac", "audio/flac-to-wav", "audio/mp4-to-m4a"],
	},
};
