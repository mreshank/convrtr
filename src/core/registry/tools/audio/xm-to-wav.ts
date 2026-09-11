import type { Tool } from "../../types";

export const xmToWav: Tool = {
	id: "audio/xm-to-wav",
	slug: "xm-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/xm",
			"audio/x-xm",
			"application/x-xm",
			"application/octet-stream",
		],
		ext: ["xm"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:xm-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 44.1 kHz Stereo (.wav)",
				explanation:
					"Synthesizes FastTracker II patterns, multisampled instruments, and linear pitch slides into pristine 16-bit stereo PCM WAV at 44,100 Hz.",
				params: { sampleRate: "44100", stereoSeparation: "0.7" },
			},
			{
				id: "visually-lossless",
				label: "High-Definition 48 kHz (.wav)",
				explanation:
					"Renders XM tracker audio at 48,000 Hz studio broadcast rate with wide stereo channel panning.",
				params: { sampleRate: "48000", stereoSeparation: "0.85" },
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
			"FastTracker XM to WAV — Convert FastTracker II Audio (.xm) to WAV | convrtr",
		h1: "Convert FastTracker II Extended Module (.xm) to WAV",
		intent:
			"Convert FastTracker II Extended Module tracker music (.xm) into universal 16-bit linear stereo PCM WAV directly in your browser. 100% private in-browser chiptune synthesizer.",
		faq: [
			{
				q: "What is a FastTracker II Extended Module (.xm) file?",
				a: "The XM (Extended Module) format was introduced in 1994 by Fredrik Huss and Magnus Högdahl of Triton for their MS-DOS music tracker FastTracker II. It expanded traditional 4-channel MOD tracking to 32 channels, 16-bit multi-sampled instruments with loop points, volume/panning envelopes, and linear frequency pitch slides.",
			},
			{
				q: "Which games and artists used the XM format?",
				a: "The XM format was the de facto standard for 1990s PC gaming and demoscene soundtracks, powering legendary titles including Unreal, Deus Ex, Jazz Jackrabbit 2, and Crusader: No Remorse, as well as thousands of demoparty releases.",
			},
			{
				q: "Why convert XM tracker files to WAV?",
				a: "Modern DAWs, streaming platforms, video editors, and mobile devices cannot natively render multi-channel tracked pattern data. Converting XM files to 16-bit linear stereo PCM WAV allows music producers, game developers, and retro enthusiasts to listen, sample, remix, and preserve iconic chiptune compositions anywhere.",
			},
			{
				q: "Are my tracker modules uploaded to a remote server?",
				a: "Never. All pattern unpacking, instrument synthesis, delta sample decoding, and audio mixing run 100% locally inside your browser memory using pure TypeScript. No audio files or data are ever transmitted across the internet.",
			},
		],
		related: [
			"audio/mod-to-wav",
			"audio/8svx-to-wav",
			"audio/aud-to-wav",
			"audio/sf2-to-wav",
		],
	},
};
