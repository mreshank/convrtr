import type { Tool } from "../../types";

export const oktToWav: Tool = {
	id: "audio/okt-to-wav",
	slug: "okt-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-oktalyzer",
			"audio/okt",
			"application/x-oktalyzer",
			"application/octet-stream",
		],
		ext: ["okt"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:okt-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Amiga Oktalyzer 4/8-channel Paula tracker modules into uncompressed 16-bit stereo CD-quality audio.",
				params: { sampleRate: 44100, stereoSeparation: 80, loopCount: 0 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "sampleRate",
				label: "Output Sample Rate (Hz)",
				group: "Synthesis",
				min: 11025,
				max: 48000,
				step: 100,
				default: 44100,
			},
			{
				control: "stepper",
				key: "stereoSeparation",
				label: "Stereo Separation (%)",
				group: "Mixer",
				min: 0,
				max: 100,
				step: 5,
				default: 80,
			},
			{
				control: "stepper",
				key: "loopCount",
				label: "Loop Count",
				group: "Playback",
				min: 0,
				max: 5,
				step: 1,
				default: 0,
			},
		],
	},
	seo: {
		title:
			"OKT to WAV — Convert Amiga Oktalyzer (.okt) to WAV Online | convrtr",
		h1: "Convert Amiga Oktalyzer (.okt) to WAV",
		intent:
			"Synthesize and convert vintage Amiga Oktalyzer tracker files (.okt) into studio-quality 16-bit 44.1kHz stereo WAV audio directly in your browser. Authentic 8-channel Paula chip mixing executed 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is an Amiga Oktalyzer (.okt) module?",
				a: "Oktalyzer is a legendary 8-channel music tracker for the Commodore Amiga created by Armin Sander in 1989. It pioneered software mixing to squeeze 8 independent channels out of the Amiga's native 4-channel Paula sound chip.",
			},
			{
				q: "How does the client-side Oktalyzer mixer work?",
				a: "convrtr emulates the Amiga PAL master clock (3.546895 MHz) and period-to-frequency resampling directly in WebAssembly/TypeScript. Samples are resampled using linear interpolation and mixed across stereo channels, producing pure linear PCM audio.",
			},
			{
				q: "Are my retro tracker files uploaded to a remote server?",
				a: "Never. All parsing, PCM sample synthesis, and WAV encoding occur exclusively in your web browser's JavaScript engine. Your files never leave your device.",
			},
		],
		related: [
			"audio/mod-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/it-to-wav",
			"audio/amf-to-wav",
		],
	},
};
