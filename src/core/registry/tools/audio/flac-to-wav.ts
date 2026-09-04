import type { Tool } from "../../types";

export const flacToWav: Tool = {
	id: "audio/flac-to-wav",
	slug: "flac-to-wav",
	category: "audio",
	kind: "convert",
	accept: { mime: ["audio/flac", "audio/x-flac"], ext: ["flac"] },
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["flac:decode"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Expands the FLAC back to uncompressed WAV. Every sample is exactly what was encoded — this direction cannot lose anything.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Convert FLAC to WAV — lossless, free, in your browser | convrtr",
		h1: "Convert FLAC to WAV",
		intent:
			"Expand FLAC files back to uncompressed WAV. Every sample is exactly what was encoded, because FLAC stores them all. Runs entirely in your browser — your audio never leaves your device.",
		faq: [
			{
				q: "Will this lose any quality?",
				a: "No, and it cannot. FLAC stores every sample of the original audio, so decoding is arithmetic rather than approximation — the WAV that comes out holds the same integers that were encoded. The file gets larger because WAV stores those samples uncompressed, not because anything was added or restored.",
			},
			{
				q: "Why would I want WAV instead of FLAC?",
				a: "Compatibility, mostly. Some older editors, samplers, DAWs and hardware read WAV and nothing else. WAV also needs no decoding, which occasionally matters for very low-latency playback. For storage FLAC is strictly better — same audio, roughly half the space.",
			},
			{
				q: "Which bit depths are supported?",
				a: "8, 16, 24 and 32-bit integer audio, which is everything FLAC carries. The output keeps the source's own depth and sample rate rather than resampling to a common format, since changing either would alter the samples this conversion exists to preserve.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while converting — or by going offline first.",
			},
		],
		related: ["audio/wav-to-flac", "audio/mp4-to-m4a", "video/trim-mp4"],
	},
};
