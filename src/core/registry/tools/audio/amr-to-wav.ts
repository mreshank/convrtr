import type { Tool } from "../../types";

export const amrToWav: Tool = {
	id: "audio/amr-to-wav",
	slug: "amr-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/amr",
			"audio/amr-wb",
			"audio/3gpp",
			"application/octet-stream",
		],
		ext: ["amr"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:amr-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "voice",
		presets: [
			{
				id: "voice",
				label: "Standard 8kHz Speech WAV",
				explanation:
					"Decodes cellular Adaptive Multi-Rate speech frames into native 8kHz 16-bit linear PCM audio.",
				params: { sampleRate: 8000, stereo: false },
			},
			{
				id: "enhanced",
				label: "Resampled 44.1kHz Stereo WAV",
				explanation:
					"Interpolates speech samples to standard 44.1kHz stereo audio for maximum compatibility with desktop video and audio editors.",
				params: { sampleRate: 44100, stereo: true },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "sampleRate",
				label: "Output Sample Rate (Hz)",
				group: "Synthesis",
				min: 8000,
				max: 48000,
				step: 1000,
				default: 8000,
			},
			{
				control: "toggle",
				key: "stereo",
				label: "Stereo Channel Duplication",
				group: "Mixer",
				default: false,
			},
		],
	},
	seo: {
		title:
			"AMR to WAV — Convert Adaptive Multi-Rate (.amr) to WAV Online | convrtr",
		h1: "Convert Adaptive Multi-Rate (.amr) to WAV",
		intent:
			"Decode and convert mobile voice recordings and MMS audio files (.amr) into standard 16-bit linear PCM WAV audio directly in your browser. Pure offline execution with zero server uploads.",
		faq: [
			{
				q: "What is an AMR (.amr) audio file?",
				a: "AMR (Adaptive Multi-Rate audio codec) is an international 3GPP speech standard widely used in 2G/3G/4G cellular telephony, MMS text attachments, mobile voice memos, and legacy VoIP streams. It adapts between eight distinct bitrates ranging from 4.75 kbps to 12.2 kbps to preserve speech intelligibility under varying network conditions.",
			},
			{
				q: "Can convrtr convert both AMR-NB and AMR-WB?",
				a: "Yes. convrtr automatically detects the magic header (#!AMR\\n for narrowband 8kHz and #!AMR-WB\\n for wideband 16kHz), unpacks the speech mode frames, and synthesizes 16-bit linear PCM WAV audio.",
			},
			{
				q: "Are my personal voicemails and voice recordings private?",
				a: "Completely private. All AMR frame parsing, LPC speech synthesis, and WAV encoding run locally in your browser sandbox. No audio data is ever transmitted over the network.",
			},
		],
		related: [
			"audio/silk-to-wav",
			"audio/ulaw-to-wav",
			"audio/vox-to-wav",
			"audio/wav-to-mp3",
		],
	},
};
