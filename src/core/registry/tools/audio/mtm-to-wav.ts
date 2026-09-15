import type { Tool } from "../../types";

export const mtmToWav: Tool = {
	id: "audio/mtm-to-wav",
	slug: "mtm-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-mtm",
			"audio/mtm",
			"application/x-multitracker",
			"application/octet-stream",
		],
		ext: ["mtm"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:mtm-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes 32-channel Renaissance MultiTracker Module songs into uncompressed 16-bit stereo CD-quality audio.",
				params: { sampleRate: 44100, stereoSeparation: 70, loopCount: 0 },
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
				default: 70,
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
			"MTM to WAV — Convert MultiTracker Module (.mtm) to WAV Online | convrtr",
		h1: "Convert MultiTracker Module (.mtm) to WAV",
		intent:
			"Synthesize and convert vintage MultiTracker Module files (.mtm) into studio-quality 16-bit 44.1kHz stereo WAV audio directly in your browser. Authentic 32-channel track matrix mixing executed 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a MultiTracker Module (.mtm) file?",
				a: "MTM is an advanced 32-channel music tracker format developed in 1993 by Daniel Gold ('SubSonic') of Renaissance for MS-DOS. It introduced a modular track-sequencing matrix that allowed patterns to reference reusable track blocks, drastically reducing file size while enabling complex 32-voice polyphony.",
			},
			{
				q: "How does the client-side MTM synthesizer work?",
				a: "convrtr emulates the 32-channel track mixer directly in WebAssembly and TypeScript. Track matrices are unpacked, 8-bit unsigned PCM samples are resampled with linear interpolation, and stereo panning positions are mixed into uncompressed 16-bit linear PCM audio.",
			},
			{
				q: "Are my retro tracker modules uploaded to external servers?",
				a: "Never. All parsing, PCM sample synthesis, and WAV encoding occur exclusively in your web browser's JavaScript engine. Your files never leave your device.",
			},
		],
		related: [
			"audio/mod-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/it-to-wav",
			"audio/okt-to-wav",
		],
	},
};
