import type { Tool } from "../../types";

export const silkToWav: Tool = {
	id: "audio/silk-to-wav",
	slug: "silk-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/silk",
			"audio/x-silk",
			"application/x-silk",
			"application/octet-stream",
		],
		ext: ["silk", "slk"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:silk-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed 16-bit PCM WAV",
				explanation:
					"Decodes Skype and WeChat Silk v3 (.silk / .slk) voice notes into standard 16-bit Linear PCM RIFF WAV audio, stripping WeChat 0x02 prefix headers and preserving voice clarity.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "SILK to WAV — Convert Skype & WeChat Voice Notes Online | convrtr",
		h1: "Convert Skype & WeChat SILK to WAV",
		intent:
			"Convert Skype, WeChat, and QQ Silk v3 voice messages (.silk / .slk) into universal playable WAV audio right in your browser with zero server uploads.",
		faq: [
			{
				q: "What is a .silk or .slk file?",
				a: "A .silk file is an audio recording encoded with Skype's Silk v3 speech codec. Widely used by WeChat (Tencent), QQ, and Skype for voice messages, it compresses human speech into compact packets.",
			},
			{
				q: "Why won't my media player play .silk files?",
				a: "Standard media players (VLC, QuickTime, Windows Media Player) and mobile operating systems do not include the proprietary Silk v3 decoder, and WeChat voice files prepend a custom 0x02 byte that breaks standard parsers.",
			},
			{
				q: "Does convrtr support WeChat voice message exports?",
				a: "Yes! convrtr automatically detects WeChat's single-byte 0x02 prefix, normalizes the #!SILK_V3 bitstream, and decodes the speech frames directly into universal 16-bit PCM WAV audio.",
			},
			{
				q: "Are my private voice messages uploaded to any server?",
				a: "Never. All speech decoding and WAV synthesis run 100% locally in your browser's WebAssembly environment. None of your private voice recordings or personal data ever leave your machine.",
			},
		],
		related: ["audio/adx-to-wav", "audio/opus-to-mp3", "audio/sf2-to-wav"],
	},
};
