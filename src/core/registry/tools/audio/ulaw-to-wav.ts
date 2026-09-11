import type { Tool } from "../../types";

export const ulawToWav: Tool = {
	id: "audio/ulaw-to-wav",
	slug: "ulaw-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/basic",
			"audio/x-mulaw",
			"audio/x-alaw",
			"audio/mulaw",
			"audio/alaw",
			"application/octet-stream",
		],
		ext: ["ulaw", "alaw", "ulw", "alw", "mulaw", "pcm", "raw"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:ulaw-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Telephony Standard 8 kHz (.wav)",
				explanation:
					"Expands 8-bit non-linear G.711 mu-law audio into standard 16-bit linear PCM WAV at 8,000 Hz.",
				params: { codec: "mulaw", sampleRate: "8000" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "codec",
				label: "G.711 Companding Format",
				group: "Audio",
				default: "mulaw",
				options: [
					{ value: "mulaw", label: "μ-law (North America, Japan, PCMU)" },
					{ value: "alaw", label: "A-law (Europe, International, PCMA)" },
				],
			},
			{
				control: "select",
				key: "sampleRate",
				label: "Sample Rate",
				group: "Audio",
				default: "8000",
				options: [
					{ value: "8000", label: "8,000 Hz (Telephony Standard)" },
					{ value: "16000", label: "16,000 Hz (Wideband / HD Voice)" },
					{ value: "11025", label: "11,025 Hz (Legacy PC Audio)" },
					{ value: "44100", label: "44,100 Hz (CD Audio)" },
				],
			},
		],
	},
	seo: {
		title:
			"G.711 u-law & A-law to WAV — Convert Raw Telephony Audio (.ulaw / .alaw) to WAV | convrtr",
		h1: "Convert G.711 μ-law & A-law Telephony Audio to WAV",
		intent:
			"Convert raw, headerless 8-bit G.711 μ-law and A-law telephony speech (.ulaw, .alaw, .pcm, .raw), PBX voicemail recordings, and Cisco call logs into playable 16-bit WAV audio directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What are .ulaw and .alaw files?",
				a: "G.711 μ-law (.ulaw / .ulw) and A-law (.alaw / .alw) are international ITU-T telecommunications standards for digitizing human speech over telephone networks, ISDN, PBX hardware, Asterisk, and VoIP systems. They store raw, headerless 8-bit non-linear companded samples at 8,000 Hz.",
			},
			{
				q: "Why convert raw G.711 to WAV?",
				a: "Because raw .ulaw and .alaw files lack standard RIFF or AIFF containers, media players, smartphones, and DAWs cannot identify or play them. Wrapping and expanding them into standard 16-bit linear PCM WAV makes them playable on any device.",
			},
			{
				q: "Which codec should I select: μ-law or A-law?",
				a: "If the recording originated from North America, Japan, or an Asterisk PCMU trunk, select μ-law. If the recording originated in Europe, the UK, or the rest of the world, select A-law. Both expand to clean 16-bit linear PCM.",
			},
			{
				q: "Are confidential phone calls or voicemail uploaded to a remote server?",
				a: "Never. All G.711 expansion and WAV compilation run 100% locally in your web browser memory using client-side TypeScript. Corporate call recordings, legal logs, and voicemails remain completely private on your computer.",
			},
		],
		related: [
			"audio/vox-to-wav",
			"audio/dsp-to-wav",
			"audio/voc-to-wav",
			"audio/au-to-wav",
		],
	},
};
