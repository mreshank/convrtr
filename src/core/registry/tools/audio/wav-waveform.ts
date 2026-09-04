import type { Tool } from "../../types";

export const waveformWAV: Tool = {
	id: "audio/wav-waveform",
	slug: "wav-waveform",
	category: "audio",
	kind: "generate",
	accept: { mime: ["audio/wav", "audio/x-wav", "audio/wave"], ext: ["wav"] },
	output: { ext: "png", mime: "image/png" },
	engines: ["waveform:wav"],
	quality: {
		// A drawing of audio, not audio. Fidelity does not apply in either
		// direction, so no preset here claims it does.
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "balanced",
				label: "Dark",
				explanation:
					"1200x300, bright trace on near-black. Suits dark documentation and slides.",
				params: { width: 1200, height: 300, scheme: "dark" },
			},
			{
				id: "visually-lossless",
				label: "Light",
				explanation:
					"1200x300, dark trace on white. Suits printing and light pages.",
				params: { width: 1200, height: 300, scheme: "light" },
			},
			{
				id: "smallest",
				label: "Transparent",
				explanation:
					"1200x300 with no background at all, so it can sit on any colour.",
				params: { width: 1200, height: 300, scheme: "transparent" },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "width",
				label: "Width in pixels",
				group: "Image",
				min: 200,
				max: 4000,
				step: 100,
				default: 1200,
			},
			{
				control: "stepper",
				key: "height",
				label: "Height in pixels",
				group: "Image",
				min: 80,
				max: 1200,
				step: 20,
				default: 300,
			},
			{
				control: "select",
				key: "scheme",
				label: "Colours",
				group: "Image",
				options: [
					{ value: "dark", label: "Bright on dark" },
					{ value: "light", label: "Dark on white" },
					{ value: "transparent", label: "Dark, no background" },
				],
				default: "dark",
			},
		],
	},
	seo: {
		title: "Make a waveform image from WAV — free, in your browser | convrtr",
		h1: "Draw a waveform from a WAV file",
		intent:
			"Turn a WAV file into a waveform image for a thumbnail, slide or article. Runs entirely in your browser — the audio never leaves your device.",
		faq: [
			{
				q: "Does the drawing show every peak?",
				a: "Yes. Each column of pixels covers thousands of samples, and convrtr takes the minimum and maximum across all of them rather than sampling one. Tools that sample instead produce a picture whose shape shifts depending on which samples they happen to land on, and which misses short transients entirely — a snare hit lasting a few hundred samples simply disappears. Taking the extremes is what audio editors do, and why their waveforms look like the sound.",
			},
			{
				q: "Why is my stereo file drawn as one shape?",
				a: "The channels are averaged so the image reads as a single trace, which is what most people want for a thumbnail or an article. A per-channel drawing is a different picture and would suit editing rather than illustration.",
			},
			{
				q: "Can I use this on a coloured background?",
				a: "Use the Transparent preset, which draws the trace with no background at all, so whatever sits behind it shows through. The output is a PNG, which stores transparency exactly.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: ["audio/flac-waveform", "audio/normalise-wav", "audio/trim-wav"],
	},
};
