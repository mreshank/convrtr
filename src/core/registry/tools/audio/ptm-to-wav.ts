import type { Tool } from "../../types";

export const ptmToWav: Tool = {
	id: "audio/ptm-to-wav",
	slug: "ptm-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-ptm",
			"audio/ptm",
			"application/x-ptm",
			"application/octet-stream",
		],
		ext: ["ptm"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:ptm-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes PolyTracker PTMF multi-channel pattern matrices and 8/16-bit PCM instruments into uncompressed 16-bit stereo CD-quality audio.",
				params: { sampleRate: 44100 },
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
		],
	},
	seo: {
		title: "PTM to WAV — Convert PolyTracker (.ptm) to WAV Online | convrtr",
		h1: "Convert PolyTracker (.ptm) to WAV",
		intent:
			"Synthesize and convert vintage PolyTracker / Epic MegaGames PTMF module files (.ptm) into high-fidelity 16-bit 44.1kHz stereo WAV audio directly in your browser. 100% private client-side synthesis with zero server uploads.",
		faq: [
			{
				q: "What is a PolyTracker (.ptm) file?",
				a: "PolyTracker (PTMF) is a 32-channel PC tracker music format created in 1994 by Carlos Hasan for Renaissance and Epic MegaGames. Used in classic DOS games such as Jazz Jackrabbit, Extreme Pinball, and Silverball, it features 8-bit and 16-bit PCM instruments, ping-pong loops, channel panning, and pattern sequencing.",
			},
			{
				q: "Why convert PolyTracker PTM modules to WAV?",
				a: "Modern media players, DAWs, and mobile devices cannot play vintage DOS .ptm tracker files natively. Converting to WAV produces clean, standard uncompressed stereo audio that plays anywhere and can be imported into modern audio editing suites.",
			},
			{
				q: "How does the in-browser PTM synthesizer work?",
				a: "The converter reads the PTMF header, parses the 32-channel panning configuration, decodes 8-bit signed and 16-bit little-endian PCM sample tables, steps through order matrices, and performs real-time multi-channel mixing into 16-bit stereo PCM samples using pure TypeScript.",
			},
			{
				q: "Are my tracker songs uploaded to any server?",
				a: "Never. All parsing, PCM sample synthesis, and WAV encoding execute 100% locally in your browser's memory. Your audio files never leave your device.",
			},
		],
		related: [
			"audio/it-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/mod-to-wav",
		],
	},
};
