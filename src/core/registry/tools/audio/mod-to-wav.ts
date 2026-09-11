import type { Tool } from "../../types";

export const modToWav: Tool = {
	id: "audio/mod-to-wav",
	slug: "mod-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/x-mod",
			"audio/mod",
			"audio/x-protracker",
			"application/octet-stream",
		],
		ext: ["mod"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:mod-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed 16-bit 44.1kHz Stereo WAV",
				explanation:
					"Synthesizes Amiga ProTracker / Ultimate SoundTracker (.mod) 4-channel module tracks, period pitch shifts, and instrument samples into clean 16-bit stereo WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"MOD to WAV — Convert Amiga ProTracker (.mod) Music to WAV | convrtr",
		h1: "Convert Amiga ProTracker MOD Module Music to WAV",
		intent:
			"Convert vintage Commodore Amiga and demoscene ProTracker / Ultimate SoundTracker module music (.mod) into studio-quality 16-bit 44.1kHz stereo WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an Amiga MOD (.mod) file?",
				a: "The MOD format is the legendary tracked music file format originated by Karsten Obarski in 1987 on the Commodore Amiga for Ultimate SoundTracker and standardized by ProTracker. It embeds digital 8-bit PCM instrument samples, pattern sequences, and Paula chip hardware playback commands in a single compact file.",
			},
			{
				q: "How does convrtr synthesize MOD files into WAV?",
				a: "convrtr features a pure client-side Amiga audio synthesis engine that accurately recreates the Paula sound chip. It parses 31 instrument sample headers, pattern order tables, and 64-row note events, calculating Amiga hardware clock period-to-frequency pitches, volume dynamics, and stereo channel spatialization to render high-fidelity 44.1 kHz stereo audio directly into a RIFF WAV container.",
			},
			{
				q: "Why convert MOD to WAV?",
				a: "Modern operating systems and smart devices cannot natively play Amiga tracker modules without specialized vintage emulation software or tracker players. Converting to universal 16-bit WAV lets you listen to your favorite demoscene and retro game soundtracks in modern music apps, DAWs, and portable devices.",
			},
			{
				q: "Are my tracker songs uploaded to any external server?",
				a: "Never. All note decoding, instrument sample playback, Paula chip frequency modeling, and WAV assembly take place strictly within your local browser memory.",
			},
		],
		related: [
			"audio/voc-to-wav",
			"audio/au-to-wav",
			"audio/aiff-to-wav",
			"audio/ircam-to-wav",
		],
	},
};
