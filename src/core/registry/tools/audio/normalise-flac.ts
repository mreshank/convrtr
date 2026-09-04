import type { Tool } from "../../types";

export const normaliseFLAC: Tool = {
	id: "audio/normalise-flac",
	slug: "normalise-flac",
	category: "audio",
	kind: "edit",
	accept: { mime: ["audio/flac", "audio/x-flac"], ext: ["flac"] },
	output: { ext: "flac", mime: "audio/flac" },
	engines: ["normalise:flac"],
	quality: {
		// Normalising changes every sample by definition. Claiming losslessness
		// here would be false, and would cheapen the claim everywhere it is true.
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "balanced",
				label: "Streaming (-14 LUFS)",
				explanation:
					"The level Spotify, YouTube and Apple Music normalise to. Matching it means your track is played as you mastered it rather than turned down on arrival.",
				params: { target: -14 },
			},
			{
				id: "visually-lossless",
				label: "Podcast (-16 LUFS)",
				explanation:
					"The usual target for spoken word, and what most podcast platforms expect.",
				params: { target: -16 },
			},
			{
				id: "smallest",
				label: "Broadcast (-23 LUFS)",
				explanation:
					"EBU R128, the European broadcast standard. Considerably quieter than streaming levels, with far more headroom.",
				params: { target: -23 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "target",
				label: "Target loudness (LUFS)",
				group: "Loudness",
				min: -36,
				max: -5,
				step: 1,
				default: -14,
			},
		],
	},
	seo: {
		title: "Normalise FLAC loudness to LUFS — free, in your browser | convrtr",
		h1: "Normalise a FLAC file's loudness",
		intent:
			"Measure a FLAC file's loudness to EBU R128 and adjust it to a target such as -14 LUFS for streaming. Runs entirely in your browser — the audio never leaves your device.",
		faq: [
			{
				q: "What is LUFS, and why not just normalise the peaks?",
				a: "LUFS measures how loud something actually sounds, not how tall its waveform is. Peak normalisation sets the loudest instant to full scale, which tells you nothing about perceived loudness — a sparse acoustic track and a dense compressed one can share a peak and differ enormously in how loud they seem. LUFS follows ITU-R BS.1770: the signal is filtered to approximate the ear's sensitivity, measured in 400ms blocks, and quiet passages are gated out so silence does not drag the figure down.",
			},
			{
				q: "Why didn't it reach the target I asked for?",
				a: "Because getting there would have clipped the peaks. If a track needs +11dB to reach -14 LUFS but only has 8dB of headroom, the remaining 3dB has nowhere to go and the loudest moments would distort. convrtr applies what fits, tells you how far short it fell and why. Clipping cannot be undone; being 3dB quiet can.",
			},
			{
				q: "Is the result still lossless?",
				a: "No, and it cannot be. Normalising multiplies every sample and rounds the result, so the file is not bit-identical to the original — that is inherent to changing loudness rather than a shortcut being taken. The rounding error sits around -96dB at 16-bit, far below audibility, but this catalogue distinguishes 'inaudible' from 'identical' and so should you. Keep the original.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: ["audio/normalise-wav", "audio/trim-flac", "audio/flac-to-wav"],
	},
};
