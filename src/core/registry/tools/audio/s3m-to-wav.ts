import type { Tool } from "../../types";

export const s3mToWav: Tool = {
	id: "audio/s3m-to-wav",
	slug: "s3m-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/s3m",
			"audio/x-s3m",
			"application/x-s3m",
			"application/octet-stream",
		],
		ext: ["s3m"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:s3m-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 44.1 kHz Stereo (.wav)",
				explanation:
					"Synthesizes Scream Tracker 3 patterns, multi-channel instruments, and frequency tables into pristine 16-bit stereo PCM WAV at 44,100 Hz.",
				params: { sampleRate: "44100", panningSeparation: "0.7" },
			},
			{
				id: "visually-lossless",
				label: "High-Definition 48 kHz (.wav)",
				explanation:
					"Renders S3M tracker audio at 48,000 Hz studio broadcast rate with wide stereo channel panning.",
				params: { sampleRate: "48000", panningSeparation: "0.85" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "sampleRate",
				label: "Audio Sample Rate",
				group: "Synthesis",
				default: "44100",
				options: [
					{ value: "44100", label: "44,100 Hz (Standard CD Audio)" },
					{ value: "48000", label: "48,000 Hz (Studio / Video)" },
					{ value: "22050", label: "22,050 Hz (Vintage Retro PC)" },
				],
			},
		],
	},
	seo: {
		title:
			"Scream Tracker S3M to WAV — Convert S3M Chiptune Tracker Audio to WAV | convrtr",
		h1: "Convert Scream Tracker 3 (.s3m) to WAV",
		intent:
			"Convert Future Crew Scream Tracker 3 (.s3m) tracker modules into universal 16-bit linear stereo PCM WAV audio directly in your browser. 100% client-side retro chiptune synthesizer.",
		faq: [
			{
				q: "What is a Scream Tracker 3 (.s3m) file?",
				a: "The S3M (Scream Tracker 3) format was created in 1994 by Sami Tammilehto (Psi) of Future Crew for PC MS-DOS. It introduced 16 digital PCM audio channels plus 9 AdLib FM channels, independent panning, sample looping, and custom tempo handling, becoming the gold standard for PC demoscene soundtracks.",
			},
			{
				q: "Which classic games used S3M soundtracks?",
				a: "Iconic 1990s PC games such as Unreal, Epic Pinball, Jazz Jackrabbit, Silverball, and Zone 66 used S3M modules for their multi-channel soundtracks, written by legendary composers like Alexander Brandon, Robert Allen, and Dan Froelich.",
			},
			{
				q: "Why convert S3M files to WAV?",
				a: "Modern audio software, operating systems, and mobile devices cannot play multi-channel tracker modules directly without specialized emulation plugins. Converting S3M files to 16-bit linear stereo PCM WAV preserves these historic digital audio compositions in a universal, lossless format for listening, archiving, and DAW production.",
			},
			{
				q: "Are my audio files uploaded to any server?",
				a: "Never. All pattern unpacking, frequency synthesis, sample looping, and multi-channel mixing execute 100% locally in your browser memory using pure TypeScript. Zero audio data is ever transmitted over the network.",
			},
		],
		related: [
			"audio/xm-to-wav",
			"audio/mod-to-wav",
			"audio/8svx-to-wav",
			"audio/aud-to-wav",
		],
	},
};
