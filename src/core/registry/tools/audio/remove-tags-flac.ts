import type { Tool } from "../../types";

export const removeTagsFlac: Tool = {
	id: "audio/remove-tags-flac",
	slug: "remove-tags-flac",
	category: "audio",
	kind: "edit",
	accept: { mime: ["audio/flac", "audio/x-flac"], ext: ["flac"] },
	output: { ext: "flac", mime: "audio/flac" },
	engines: ["metadata:strip-flac"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Rewrites the metadata blocks and copies the audio frames across untouched. The audio is bit-identical, and the seek table is kept so seeking stays fast.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Remove tags from a FLAC — lossless, in your browser | convrtr",
		h1: "Remove tags from a FLAC",
		intent:
			"Strip Vorbis comments and embedded artwork from a FLAC without re-encoding it. The audio frames are copied across untouched. Runs entirely in your browser — the file never leaves your device.",
		faq: [
			{
				q: "Does this re-encode the audio?",
				a: "No. A FLAC is the marker 'fLaC', then a run of metadata blocks, then the audio frames — so unwanted blocks can be dropped by rewriting the list and copying the frames verbatim. For a format whose whole purpose is exactness, anything less would be self-defeating.",
			},
			{
				q: "What is kept?",
				a: "STREAMINFO, which the decoder cannot work without and which holds only the sample rate, channel count, bit depth and a checksum of the audio; and the seek table, which is purely functional and makes seeking fast. Vorbis comments, embedded artwork, application blocks, cue sheets and padding are all removed — including the vendor string, which names the exact encoder and version that produced the file.",
			},
			{
				q: "Why did the file get noticeably smaller?",
				a: "Almost certainly embedded cover art. A single high-resolution image can be several megabytes, which is often a large fraction of a FLAC's size. The audio itself is unchanged.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: ["audio/remove-tags-mp3", "audio/wav-to-flac", "audio/trim-flac"],
	},
};
