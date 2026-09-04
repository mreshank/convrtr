import type { Tool } from "../../types";

export const trimWav: Tool = {
	id: "audio/trim-wav",
	slug: "trim-wav",
	category: "audio",
	kind: "edit",
	accept: { mime: ["audio/wav", "audio/x-wav", "audio/wave"], ext: ["wav"] },
	output: { ext: "wav", mime: "audio/wav" },
	engines: ["trim:wav"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Keeps the samples inside your selection and discards the rest. Nothing is decoded or re-encoded, and the cut lands exactly where you put it.",
				params: {},
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
		],
	},
	seo: {
		title: "Trim a WAV file — lossless, free, in your browser | convrtr",
		h1: "Trim a WAV file",
		intent:
			"Cut a section out of a WAV file without re-encoding it. The samples you keep are the samples that were there, and the cut is exact to the sample. Runs entirely in your browser — the audio never leaves your device.",
		faq: [
			{
				q: "Is the cut exactly where I put it?",
				a: "Yes, to the individual sample — about a fortieth of a millisecond at CD rate. Audio samples do not depend on the ones before them, so there is nothing to snap to. Video trimming is different: frames are stored as differences from earlier frames, so a cut has to begin at a keyframe, which is why our video trimmer reports where it actually landed.",
			},
			{
				q: "Does trimming lose any quality?",
				a: "No. WAV holds uncompressed samples, so trimming copies the ones inside your selection and drops the rest. Nothing is decoded, re-encoded or recalculated.",
			},
			{
				q: "The file is still large — can I make it smaller?",
				a: "Convert the result to FLAC, which stores the identical samples in roughly half the space. If you need it smaller than that, MP3 or Opus will do it by discarding audio, which is a different trade and one those tools state plainly.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while trimming — or by going offline first.",
			},
		],
		related: ["audio/trim-flac", "audio/wav-to-flac", "audio/wav-to-mp3"],
	},
};
