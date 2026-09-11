import type { Tool } from "../../types";

export const scormToZip: Tool = {
	id: "document/scorm-to-zip",
	slug: "scorm-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/zip",
			"application/x-scorm",
			"application/octet-stream",
		],
		ext: ["zip", "scorm"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:scorm-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Organized Media Archive",
				explanation:
					"Scans the SCORM / Articulate / Captivate course package, extracts embedded MP4 videos, narration audio, high-res images, and PDFs, and groups them cleanly into folders.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SCORM to ZIP — Extract Videos, Audio & Media from Course Packages | convrtr",
		h1: "Extract Media from SCORM Course Packages",
		intent:
			"Extract embedded MP4 video lectures, MP3 audio narrations, diagrams, and PDF handouts from SCORM (1.2 & 2004), Articulate Storyline, Rise 360, and Adobe Captivate course ZIP files directly in your browser. Bypasses LMS runtime blockers with 100% private client-side extraction.",
		faq: [
			{
				q: "How do I get MP4 videos out of a SCORM or Storyline course?",
				a: "SCORM packages hide media inside deeply nested subdirectories (like story_content/ or scormcontent/assets/). This tool automatically searches the package, identifies raw video and audio files, strips web player boilerplate, and delivers an organized ZIP with videos/, audio/, and images/ folders.",
			},
			{
				q: "Does this require an active LMS or SCORM Cloud subscription?",
				a: "No. You don't need Moodle, Canvas, Blackboard, or SCORM Cloud. The extraction executes completely in your web browser by parsing the package manifest and archive structure locally.",
			},
			{
				q: "Are video and audio files re-encoded or compressed?",
				a: "No. All media assets are extracted bit-for-bit with their original authoring quality. There is zero re-encoding, transcoding, or quality loss.",
			},
			{
				q: "Is confidential company training data kept private?",
				a: "Yes. The entire extraction occurs entirely on your device inside browser memory. Your company onboarding modules, compliance courses, and proprietary materials are never uploaded to any cloud server.",
			},
		],
		related: [],
	},
};
