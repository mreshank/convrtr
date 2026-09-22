import type { Tool } from "../../types";

export const rppToJson: Tool = {
	id: "document/rpp-to-json",
	slug: "rpp-to-json",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-reaper", "text/plain", "application/octet-stream"],
		ext: ["rpp", "rpp-bak"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:rpp-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Structured Session Summary",
				explanation:
					"Reads the plain-text project chunks and inventories tempo, tracks, items, source media, markers, regions and plugins as structured JSON. Nothing is reinterpreted or dropped silently.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "RPP to JSON — Read REAPER Projects Without REAPER | convrtr",
		h1: "Convert REAPER Project (.rpp) to JSON",
		intent:
			"Inventory any REAPER session (.rpp) without installing REAPER: tempo map, tracks, media items with source files, markers, regions and FX chain plugins. Ideal for archiving sessions, migrating DAWs, or auditing a backup drive — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "I have a folder of .rpp files but no REAPER licence. What does this tell me?",
				a: "Everything structural: the REAPER version that saved it, tempo and time signature, every track with its items and referenced audio/MIDI files, markers and regions, and every plugin in the FX chains — so you know what each session contains before deciding what to open.",
			},
			{
				q: "Can it recover the actual audio?",
				a: "No tool can from the project file alone: .rpp files reference media on disk rather than embedding it. The JSON lists every source file so you can locate or relink them; rendering still needs REAPER.",
			},
			{
				q: "Does it support .rpp-bak backup files?",
				a: "Yes — REAPER backups use the identical chunk grammar, so both extensions are accepted by the same parser.",
			},
			{
				q: "Are my unreleased sessions uploaded anywhere?",
				a: "No. Parsing runs entirely inside your browser. Unreleased music never leaves your device.",
			},
		],
		related: [
			"document/als-to-json",
			"document/cue-to-json",
			"audio/sf2-to-wav",
		],
	},
};
