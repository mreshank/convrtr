import type { Tool } from "../../types";

export const radToWav: Tool = {
	id: "audio/rad-to-wav",
	slug: "rad-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-rad",
			"audio/rad",
			"application/x-rad",
			"application/octet-stream",
		],
		ext: ["rad"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:rad-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Reality Adlib Tracker 9-channel Yamaha OPL2 2-operator FM synthesis into uncompressed 16-bit stereo CD-quality audio.",
				params: { sampleRate: 44100, stereoSeparation: 70 },
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
		],
	},
	seo: {
		title:
			"RAD to WAV — Convert Reality Adlib Tracker (.rad) to WAV Online | convrtr",
		h1: "Convert Reality Adlib Tracker (.rad) to WAV",
		intent:
			"Synthesize and convert vintage Reality Adlib Tracker files (.rad) into studio-quality 16-bit 44.1kHz stereo WAV audio directly in your browser. Authentic Yamaha OPL2/OPL3 FM synthesis executed 100% offline with zero server uploads.",
		faq: [
			{
				q: "What is a Reality Adlib Tracker (.rad) file?",
				a: "Reality Adlib Tracker (RAD) is an MS-DOS music tracker created by Reality (Jan Kiszka) in the 1990s. Unlike sample-based trackers like ProTracker or FastTracker, RAD uses Yamaha YM3812 (OPL2) 2-operator FM synthesis to generate chiptune melodies and sound effects.",
			},
			{
				q: "How does the client-side FM synthesizer work?",
				a: "convrtr emulates the 9-channel Yamaha OPL2 FM sound generation directly in WebAssembly/TypeScript. Carrier and modulator sine wave oscillators are modulated at 44.1 kHz using authentic ADSR envelope curves, producing pure linear PCM audio.",
			},
			{
				q: "Are my retro tracker files uploaded to a remote server?",
				a: "Never. All parsing, FM frequency synthesis, and WAV encoding occur exclusively in your web browser's JavaScript engine. Your files never leave your device.",
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
