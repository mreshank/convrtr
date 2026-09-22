import type { Tool } from "../../types";

export const styToMid: Tool = {
	id: "audio/sty-to-mid",
	slug: "sty-to-mid",
	category: "audio",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "audio/midi", "audio/x-midi"],
		ext: ["sty", "prs", "bpt", "sst"],
	},
	output: { ext: "mid", mime: "audio/midi" },
	engines: ["extract:sty-to-mid"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard MIDI File (SMF)",
				explanation:
					"Locates the embedded MThd sequence, strips non-standard Yamaha CASM/OTS chunks, and exports bit-exact SMF Type 0/1 MIDI tracks.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "STY to MIDI — Convert Yamaha Style to MIDI | convrtr",
		h1: "Convert Yamaha STY Style to Standard MIDI",
		intent:
			"Extract standard MIDI (.mid) files from Yamaha arranger keyboard style files (.sty, .prs, .bpt). Use backing rhythms, intros, and chord variations in FL Studio, Ableton, Logic, and Reaper.",
		faq: [
			{
				q: "Why will my DAW not open a Yamaha .sty file?",
				a: "Yamaha arranger styles prepend and append proprietary non-MIDI chunks (such as CASM and OTS) to the standard MIDI stream. Standard DAWs reject these containers as invalid files.",
			},
			{
				q: "Does this conversion re-encode or degrade audio?",
				a: "No. This tool performs a lossless extraction of the original MIDI note and controller events directly from the MTrk chunks without transcoding.",
			},
			{
				q: "Which Yamaha keyboard models are supported?",
				a: "All Yamaha keyboards using SFF1 and SFF2/GE style architectures are supported, including Tyros, Genos, PSR, PSR-S, PSR-SX, and Clavinova models.",
			},
			{
				q: "Will section markers (Main A, Fill, Intro) be preserved?",
				a: "Yes. Standard MIDI text and marker meta events are preserved in the extracted MIDI track so your DAW can display section cues.",
			},
		],
		related: [
			"document/cue-to-json",
			"document/als-to-json",
			"document/rpp-to-json",
		],
	},
};
