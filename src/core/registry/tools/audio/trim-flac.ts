import type { Tool } from "../../types";

export const trimFlac: Tool = {
	id: "audio/trim-flac",
	slug: "trim-flac",
	category: "audio",
	kind: "edit",
	accept: { mime: ["audio/flac", "audio/x-flac"], ext: ["flac"] },
	output: { ext: "flac", mime: "audio/flac" },
	engines: ["trim:flac"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Decodes, cuts exactly where you asked, and re-encodes. That costs time but not quality — FLAC reproduces its input exactly, so the samples kept are the samples that were there.",
				params: { compression: 5 },
			},
		],
		advanced: [
			{
				control: "timerange",
				startKey: "start",
				endKey: "end",
				label: "Clip",
				group: "Selection",
			},
			{
				control: "stepper",
				key: "compression",
				label: "Compression effort (0 fastest, 8 smallest)",
				group: "Encoder",
				min: 0,
				max: 8,
				step: 1,
				default: 5,
			},
		],
	},
	seo: {
		title: "Trim a FLAC file — lossless, free, in your browser | convrtr",
		h1: "Trim a FLAC file",
		intent:
			"Cut a section out of a FLAC file without losing quality. The file is decoded, cut exactly where you choose and re-encoded — and because FLAC is lossless in both directions, the result holds the same samples the original did. Runs entirely in your browser.",
		faq: [
			{
				q: "Doesn't re-encoding lose quality?",
				a: "Not with FLAC, and this is the difference that matters. Re-encoding an MP3 costs quality every time, because each pass discards more audio. FLAC reproduces its input exactly, so decoding and re-encoding returns the identical samples — you can do it a hundred times and compare the files. The only cost is the time it takes.",
			},
			{
				q: "Is the cut exactly where I put it?",
				a: "Yes, to the individual sample. Audio samples are independent of one another, so unlike video — where a copy-based cut must start at a keyframe — there is nothing to snap to and no shift to report.",
			},
			{
				q: "Why is the trimmed file not proportionally smaller?",
				a: "FLAC's compression depends on what the audio contains, not just how long it is. A quiet passage compresses much further than a dense one, so cutting half the running time might remove rather more or rather less than half the bytes. The audio itself is unaffected either way.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while trimming — or by going offline first.",
			},
		],
		related: ["audio/trim-wav", "audio/flac-to-wav", "audio/wav-to-flac"],
	},
};
