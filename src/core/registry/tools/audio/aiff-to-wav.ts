import type { Tool } from "../../types";

export const aiffToWav: Tool = {
	id: "audio/aiff-to-wav",
	slug: "aiff-to-wav",
	category: "audio",
	kind: "convert",
	accept: {
		mime: [
			"audio/aiff",
			"audio/x-aiff",
			"sound/aiff",
			"audio/x-pn-aiff",
			"application/octet-stream",
		],
		ext: ["aif", "aiff", "aifc"],
	},
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["extract:aiff-to-wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Uncompressed RIFF WAV",
				explanation:
					"Decodes Apple Macintosh Audio Interchange File Format (.aif / .aiff) Big-Endian PCM audio into universal 16-bit linear PCM WAV.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"AIFF to WAV — Convert Apple AIFF (.aif / .aiff) Audio to WAV | convrtr",
		h1: "Convert Apple AIFF to WAV",
		intent:
			"Convert Apple Macintosh Audio Interchange File Format (.aif, .aiff) studio recordings, vintage Logic sessions, and sample CD tracks into universally playable 16-bit linear PCM WAV in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an AIFF file?",
				a: "AIFF (Audio Interchange File Format) is an uncompressed audio container developed by Apple in 1988 for Macintosh personal computers. It is structurally similar to IFF and stores uncompressed PCM audio in Big-Endian byte order.",
			},
			{
				q: "Why convert AIFF to WAV?",
				a: "While AIFF and WAV both store uncompressed studio-quality PCM, many Windows programs, web APIs, car stereos, and hardware samplers only support little-endian RIFF WAV. Converting AIFF to WAV provides 100% universal hardware and software compatibility.",
			},
			{
				q: "Is any audio quality lost during AIFF to WAV conversion?",
				a: "Zero. Both AIFF and WAV store uncompressed linear PCM. convrtr unpacks the Big-Endian samples and writes them into little-endian RIFF WAV without any re-encoding loss.",
			},
			{
				q: "Are my studio recordings uploaded to a server?",
				a: "Never. All parsing and byte conversions happen 100% locally in your browser memory.",
			},
		],
		related: ["audio/au-to-wav", "audio/wav-to-flac", "audio/flac-to-wav"],
	},
};
