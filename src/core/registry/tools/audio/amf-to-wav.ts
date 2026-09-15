import type { Tool } from "../../types";

export const amfToWav: Tool = {
	id: "audio/amf-to-wav",
	slug: "amf-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-amf",
			"audio/amf",
			"application/x-amf",
			"application/octet-stream",
		],
		ext: ["amf"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:amf-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Advanced Music Format 16-channel pattern matrices and 8-bit PCM instruments into uncompressed 16-bit stereo CD-quality audio.",
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
		title:
			"AMF to WAV — Convert Advanced Music Format (.amf) to WAV Online | convrtr",
		h1: "Convert Advanced Music Format (.amf) to WAV",
		intent:
			"Synthesize and convert vintage Advanced Music Format and ASYLUM tracker files (.amf) into high-fidelity 16-bit 44.1kHz stereo WAV audio directly in your browser. 100% private client-side synthesis with zero server uploads.",
		faq: [
			{
				q: "What is an Advanced Music Format (.amf) file?",
				a: "Advanced Music Format (AMF), originally created in 1993 by Otto Chrons for the Digital Sound & Music Interface (DSMI) and ASYLUM tracker, is a versatile PC module tracker format supporting up to 16 channels, multi-sample instruments, and custom tempo tracking.",
			},
			{
				q: "Why convert AMF tracker modules to WAV?",
				a: "Vintage AMF tracker files cannot be played natively by modern operating systems, smartphones, or digital audio workstations (DAWs). Converting to standard WAV renders the 16-channel patterns and samples into universal linear PCM audio.",
			},
			{
				q: "How does the in-browser AMF synthesizer work?",
				a: "The engine validates the AMF or ASYLUM signature, unpacks song metadata, orders, pattern matrices, and 8-bit PCM audio samples. It runs software multi-channel mixing, pitch interpolation, and stereo panning entirely in browser memory to produce standard 16-bit RIFF WAV audio.",
			},
			{
				q: "Are my tracker songs uploaded to any server?",
				a: "No. All parsing, voice resampling, and WAV encoding execute strictly inside your local browser runtime. Zero network requests are made.",
			},
		],
		related: [
			"audio/far-to-wav",
			"audio/669-to-wav",
			"audio/s3m-to-wav",
			"audio/it-to-wav",
			"audio/xm-to-wav",
		],
	},
};
