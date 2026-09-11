import type { Tool } from "../../types";

export const voxToWav: Tool = {
	id: "audio/vox-to-wav",
	slug: "vox-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: ["audio/vox", "audio/x-vox", "application/octet-stream"],
		ext: ["vox"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:vox-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Telephony Standard 8 kHz (.wav)",
				explanation:
					"Decodes 4-bit Dialogic OKI ADPCM telephony speech into clean 16-bit linear PCM WAV at 8,000 Hz.",
				params: { sampleRate: 8000 },
			},
		],
		advanced: [
			{
				control: "select",
				key: "sampleRate",
				label: "Sample Rate",
				group: "Audio",
				default: "8000",
				options: [
					{ value: "6000", label: "6,000 Hz (Legacy Dialogic)" },
					{ value: "8000", label: "8,000 Hz (Telephony Standard)" },
					{ value: "11025", label: "11,025 Hz (Wideband Speech)" },
					{ value: "16000", label: "16,000 Hz (High Fidelity IVR)" },
				],
			},
		],
	},
	seo: {
		title: "VOX to WAV — Convert Dialogic ADPCM Audio (.vox) to WAV | convrtr",
		h1: "Convert Dialogic VOX Audio to WAV",
		intent:
			"Convert legacy Dialogic / OKI ADPCM telephony audio (.vox), IVR recordings, and voicemail prompts directly into playable 16-bit WAV audio in your browser. 100% client-side with zero server uploads.",
		faq: [
			{
				q: "What is a VOX file?",
				a: "A VOX file is a headerless raw audio format containing 4-bit Dialogic (OKI) ADPCM compressed voice data. It has been standard in computer telephony, PBX hardware, Asterisk, interactive voice response (IVR) systems, and retro PC games for decades.",
			},
			{
				q: "Why convert VOX to WAV?",
				a: "Because VOX files lack file headers or sample rate metadata, modern media players, DAWs, and smartphones cannot play them. Converting VOX to 16-bit RIFF WAV makes speech prompts immediately audible in any media player or editing software.",
			},
			{
				q: "What sample rate should I choose?",
				a: "Most North American and European telephony systems record Dialogic VOX at 8,000 Hz (8 kHz). Some legacy PC systems use 6,000 Hz, while wideband IVR prompts use 11,025 Hz or 16,000 Hz.",
			},
			{
				q: "Are my telephony audio recordings uploaded to an external server?",
				a: "Never. All 4-bit ADPCM decompression and WAV packaging execute completely client-side inside your web browser. Sensitive call recordings and voicemail prompts remain strictly on your machine.",
			},
		],
		related: [
			"audio/dsp-to-wav",
			"audio/voc-to-wav",
			"audio/8svx-to-wav",
			"audio/adx-to-wav",
		],
	},
};
