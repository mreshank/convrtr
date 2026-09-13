import type { Tool } from "../../types";

export const sixSixNineToWav: Tool = {
	id: "audio/669-to-wav",
	slug: "669-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-mod-669",
			"audio/x-669",
			"audio/669",
			"application/x-669",
			"application/octet-stream",
		],
		ext: ["669"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:669-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Composer 669 and UNIS 669 8-channel tracker patterns and 8-bit PCM samples into uncompressed 16-bit stereo CD-quality audio.",
				params: { sampleRate: 44100 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "sampleRate",
				label: "Output Sample Rate (Hz)",
				group: "Audio Quality",
				min: 11025,
				max: 48000,
				step: 100,
				default: 44100,
			},
		],
	},
	seo: {
		title: "669 to WAV — Convert Composer 669 (.669) to WAV Online | convrtr",
		h1: "Convert Composer 669 (.669) to WAV",
		intent:
			"Convert vintage Composer 669 and UNIS 669 tracker modules (.669) into high-fidelity 16-bit 44.1kHz stereo WAV audio directly in your browser. 100% private client-side synthesis with zero server uploads.",
		faq: [
			{
				q: "What is a 669 (.669) tracker file?",
				a: "669 is an 8-channel PC tracker music format created in 1992 by Tomasz Kojm (Composer 669) and later expanded by Tran of Renaissance (UNIS 669). Identified by 'if' or 'JN' magic headers, it was one of the earliest PC formats to support 8 simultaneous audio channels on early Sound Blaster and Gravis UltraSound sound cards.",
			},
			{
				q: "Why convert Composer 669 modules to WAV?",
				a: "Modern operating systems, smartphones, and DAWs cannot play vintage MS-DOS .669 tracker files. Converting to WAV produces standard uncompressed linear PCM audio that plays on any device and can be sampled in modern audio production software.",
			},
			{
				q: "How does the in-browser 669 synthesizer work?",
				a: "The converter decodes 669 song messages, order lists, and 25-byte sample descriptors, unpacks 8-channel pattern matrices, and runs a real-time software mixing engine with pitch transposition, loop wrap-around, and stereo panning into 16-bit stereo WAV.",
			},
			{
				q: "Are my music files uploaded to a remote server?",
				a: "Never. All parsing, PCM sample synthesis, and WAV encoding execute 100% locally in your browser using pure TypeScript. Your music files never leave your device.",
			},
		],
		related: [
			"audio/mod-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/it-to-wav",
			"audio/far-to-wav",
		],
	},
};
