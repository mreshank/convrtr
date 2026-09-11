import type { Tool } from "../../types";

export const opusToMp3: Tool = {
	id: "audio/opus-to-mp3",
	slug: "opus-to-mp3",
	category: "audio",
	kind: "convert",
	accept: {
		mime: ["audio/opus", "audio/ogg", "application/ogg"],
		ext: ["opus", "ogg"],
	},
	output: { ext: "mp3", mime: "audio/mpeg" },
	engines: ["ffmpeg:opus->mp3"],
	heavyDownloadMb: 31,
	quality: {
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "balanced",
				label: "Standard 192k",
				explanation:
					"Transcodes Opus voice notes and audio clips into universal 192kbps MP3 compatible with all players, car stereos, and editing software.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Opus to MP3 — Convert WhatsApp Voice Notes to MP3 Online Free | convrtr",
		h1: "Convert Opus to MP3",
		intent:
			"Convert WhatsApp voice notes (.opus, .ogg) into universal MP3 audio directly in your browser. Play voice notes in Windows Media Player, QuickTime, Premiere Pro, or DaVinci Resolve without uploading your private voice messages to a remote server.",
		faq: [
			{
				q: "Why won't my computer or audio editor play WhatsApp .opus files?",
				a: "WhatsApp voice messages use the Opus speech codec inside an Ogg container, which many default desktop media players (Windows Media Player, older QuickTime) and editing suites (Premiere, DaVinci Resolve) do not recognize. Converting to MP3 ensures universal playback across every device.",
			},
			{
				q: "Are my personal voice notes kept private?",
				a: "Yes. The conversion executes entirely in your browser using local WebAssembly. Your personal conversations, voice recordings, and interviews are never sent to any server.",
			},
			{
				q: "Does this handle both .opus and .ogg voice notes?",
				a: "Yes. Both Android WhatsApp voice notes (.opus) and iOS/desktop voice notes (.ogg) are fully supported.",
			},
		],
		related: ["audio/wav-to-mp3"],
	},
};
