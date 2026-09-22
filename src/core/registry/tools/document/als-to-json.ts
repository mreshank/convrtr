import type { Tool } from "../../types";

export const alsToJson: Tool = {
	id: "document/als-to-json",
	slug: "als-to-json",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/gzip",
			"application/x-gzip",
			"application/octet-stream",
		],
		ext: ["als"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:als-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Structured Project Summary",
				explanation:
					"Decompresses the Live Set and inventories tempo, time signature, tracks, devices/plugins and referenced sample files as structured JSON. Nothing is reinterpreted or dropped silently.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "ALS to JSON — Read Ableton Projects Without Ableton | convrtr",
		h1: "Convert Ableton Live Set (.als) to JSON",
		intent:
			"Inventory any Ableton Live Set (.als) without owning Ableton Live: tempo, tracks, instruments, effects and the sample files the project needs. Ideal for archiving a collection, migrating DAWs, or recovering the story of a track from a backup drive — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "I inherited a drive full of .als files and don't own Ableton. What does this tell me?",
				a: "Everything structural: the Live version that saved it, tempo, time signature, every track with its instruments and effects, and the exact sample file names the project references — so you know what each project is and which audio files to hunt down.",
			},
			{
				q: "Can it recover the actual audio / stems?",
				a: "No tool can: .als files store no audio, only references to sample files on the producer's disk. The JSON lists every referenced sample so you can locate or relink them; rendering stems still needs the DAW with its plugins.",
			},
			{
				q: "Which Live versions are supported?",
				a: "The extractor uses tolerant parsing that degrades gracefully across Live 8 through 12 project schemas. Unknown newer elements are skipped rather than failing the whole file.",
			},
			{
				q: "Are my unreleased tracks uploaded anywhere?",
				a: "No. Decompression and parsing run entirely inside your browser. Unreleased music never leaves your device.",
			},
		],
		related: [
			"document/cue-to-json",
			"document/opml-to-markdown",
			"audio/sf2-to-wav",
		],
	},
};
