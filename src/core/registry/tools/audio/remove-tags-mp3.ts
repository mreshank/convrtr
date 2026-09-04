import type { Tool } from "../../types";

export const removeTagsMp3: Tool = {
	id: "audio/remove-tags-mp3",
	slug: "remove-tags-mp3",
	category: "audio",
	kind: "edit",
	accept: { mime: ["audio/mpeg", "audio/mp3"], ext: ["mp3"] },
	output: { ext: "mp3", mime: "audio/mpeg" },
	engines: ["metadata:strip-mp3"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Removes the tag blocks and copies the audio across untouched. The sound is bit-identical — nothing is decoded or re-encoded.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Remove tags from an MP3 — lossless, in your browser | convrtr",
		h1: "Remove tags from an MP3",
		intent:
			"Strip ID3 tags, comments and embedded artwork from an MP3 without re-encoding it. The audio comes out bit-identical. Runs entirely in your browser — the file never leaves your device.",
		faq: [
			{
				q: "Does this change the audio at all?",
				a: "No, not by a single byte. MP3 tags sit in blocks before and after the audio rather than being mixed through it, so removing them means copying the audio range out verbatim. Tools that decode and re-encode to produce a 'clean' file cost you real quality to remove a comment field — that trade is unnecessary and convrtr does not make it.",
			},
			{
				q: "What is actually in those tags?",
				a: "More than most people expect. Beyond title and artist, ID3 frames routinely carry the ripping software and its version, encoder settings, purchase identifiers from music stores, MusicBrainz IDs tying the file to a specific release, and free-text comments that have a habit of containing usernames and file paths. Embedded artwork is often the largest part of the file.",
			},
			{
				q: "Will it still play, and will my player show anything?",
				a: "It plays exactly as before. Players will show the filename instead of a title, since there is no longer a title to read, and no cover art. If you want to keep some tags and drop others, this is the wrong tool — it removes all of them.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: [
			"audio/remove-tags-flac",
			"image/remove-exif-jpg",
			"audio/wav-to-mp3",
		],
	},
};
