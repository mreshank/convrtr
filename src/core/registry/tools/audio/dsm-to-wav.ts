import type { Tool } from "../../types";

export const dsmToWav: Tool = {
	id: "audio/dsm-to-wav",
	slug: "dsm-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-dsm",
			"audio/dsm",
			"application/x-dsm",
			"application/octet-stream",
		],
		ext: ["dsm"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:dsm-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Dynamic Studio Module 16-channel RIFF patterns and 8-bit PCM instruments into uncompressed 16-bit stereo CD-quality audio.",
				params: { sampleRate: 44100, stereoSeparation: 75 },
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
				default: 75,
			},
		],
	},
	seo: {
		title:
			"DSM to WAV — Convert Dynamic Studio Module (.dsm) to WAV Online | convrtr",
		h1: "Convert Dynamic Studio Module (.dsm) to WAV",
		intent:
			"Synthesize and convert vintage Dynamic Studio Module files (.dsm) into studio-quality 16-bit 44.1kHz stereo WAV audio directly in your browser. 100% private client-side synthesis with zero server uploads.",
		faq: [
			{
				q: "What is a Dynamic Studio Module (.dsm) file?",
				a: "Dynamic Studio Module (DSM) is an early 1990s PC music tracker format developed by DSIK based on the RIFF container architecture (DSMF). It supports up to 16 digital PCM channels, custom channel panning, and multi-sample instrument banks.",
			},
			{
				q: "Why convert DSM tracker modules to WAV?",
				a: "Vintage DSM tracker files cannot be opened or played by modern operating systems, mobile devices, or DAWs. Converting to uncompressed WAV creates a universal high-fidelity recording suitable for modern listening and music production.",
			},
			{
				q: "How does the in-browser DSM synthesizer work?",
				a: "convrtr parses the RIFF container and internal SONG, INST, and PATT chunks, simulates the 16-channel tracker playback engine, and renders linear interpolated 8-bit PCM waveforms to 16-bit stereo WAV entirely within your browser.",
			},
			{
				q: "Are my tracker files sent to an external server?",
				a: "Never. All parsing, voice mixing, and WAV encoding execute 100% locally in your web browser memory using client-side TypeScript.",
			},
		],
		related: [
			"audio/amf-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/mod-to-wav",
			"audio/it-to-wav",
		],
	},
};
