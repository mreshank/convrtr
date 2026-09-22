import type { Tool } from "../../types";

export const xp3ToZip: Tool = {
	id: "document/xp3-to-zip",
	slug: "xp3-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-xp3-archive"],
		ext: ["xp3"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:xp3-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "zip",
		presets: [
			{
				id: "zip",
				label: "Extracted Assets ZIP (.zip)",
				explanation:
					"Extracts all visual novel scenario scripts (.ks, .tjs), images (.tlg, .png), and audio streams into an uncompressed ZIP archive with a manifest.",
				params: { json: false },
			},
			{
				id: "json",
				label: "Archive Manifest (.json)",
				explanation:
					"Scans the XP3 index and outputs file names, archived byte sizes, and uncompressed byte counts as structured JSON.",
				params: { json: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "XP3 to ZIP — Extract KiriKiri Visual Novel Archive | convrtr",
		h1: "Extract KiriKiri / TVP (.xp3) Archives to ZIP",
		intent:
			"Unpack images, music, voices, and scenario scripts from KiriKiri visual novel .xp3 archives directly in your browser without downloading suspicious desktop executables.",
		faq: [
			{
				q: "What is an XP3 archive?",
				a: "XP3 is the proprietary archive format used by W.Dee's KiriKiri 2 and TVP visual novel engines (powering titles like Fate/stay night, Tsukihime, and Steins;Gate) to store background graphics, sprites, voice tracks, and scenario scripts.",
			},
			{
				q: "Does this require installing desktop extractors?",
				a: "No. Unlike legacy Windows utilities like GARbro, convrtr runs 100% in your web browser with zero installation or risk of executable malware.",
			},
			{
				q: "Are large multi-gigabyte archives supported?",
				a: "Yes. Slicing and deflation run in client-side Web Workers, keeping memory consumption low.",
			},
		],
		related: [
			"document/nscript-to-txt",
			"document/rpa-to-zip",
			"document/pck-to-zip",
		],
	},
};
