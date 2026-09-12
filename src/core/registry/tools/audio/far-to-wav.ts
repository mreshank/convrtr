import type { Tool } from "../../types";

export const farToWav: Tool = {
	id: "audio/far-to-wav",
	slug: "far-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-far",
			"audio/far",
			"application/x-far",
			"application/octet-stream",
		],
		ext: ["far"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:far-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "cd",
		presets: [
			{
				id: "cd",
				label: "16-Bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Farandole Composer 16-channel pattern matrices and 8-bit PCM instruments into uncompressed 16-bit stereo CD-quality audio.",
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
			"FAR to WAV — Convert Farandole Composer (.far) to WAV Online | convrtr",
		h1: "Convert Farandole Composer (.far) to WAV",
		intent:
			"Synthesize and convert vintage Farandole Composer module tracker files (.far) into high-fidelity 16-bit 44.1kHz stereo WAV audio directly in your browser. 100% private client-side synthesis with zero server uploads.",
		faq: [
			{
				q: "What is a Farandole Composer (.far) file?",
				a: "Farandole Composer (FAR) is a 16-channel PC tracker music format created in 1994 by Daniel Potter. Popular in DOS demoscene productions and indie PC games, it combines 16-channel pattern matrices with 8-bit linear PCM samples, custom panning, and song comments.",
			},
			{
				q: "Why convert Farandole Composer FAR modules to WAV?",
				a: "Vintage Farandole tracker files cannot be played by modern media players, streaming platforms, or digital audio workstations (DAWs). Converting to WAV renders the chiptune patterns into standard linear PCM stereo audio compatible with any modern device.",
			},
			{
				q: "How does the in-browser FAR synthesizer work?",
				a: "The engine parses the FAR\\xFE signature, song headers, 16-channel panning assignments, pattern cell matrices, and 8-bit signed PCM sample banks. It then performs real-time multi-channel mixing, pitch interpolation, and stereo panning into standard 16-bit RIFF WAV audio.",
			},
			{
				q: "Are my tracker songs uploaded to any server?",
				a: "No. The entire synthesis, sample interpolation, and WAV encoding process executes 100% locally in your browser memory via pure TypeScript. Zero bytes leave your machine.",
			},
		],
		related: [
			"audio/ptm-to-wav",
			"audio/it-to-wav",
			"audio/s3m-to-wav",
			"audio/xm-to-wav",
			"audio/mod-to-wav",
		],
	},
};
