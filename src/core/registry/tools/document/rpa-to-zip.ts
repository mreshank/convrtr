import type { Tool } from "../../types";

export const rpaToZip: Tool = {
	id: "document/rpa-to-zip",
	slug: "rpa-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/x-rpa", "application/octet-stream"],
		ext: ["rpa"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:rpa-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless Archive",
				explanation:
					"Extracts all Ren'Py visual novel scripts (.rpy, .rpyc), background art, character sprites, and sound effects into a structured ZIP archive.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Ren'Py RPA to ZIP — Unpack .rpa Visual Novel Archives Online | convrtr",
		h1: "Unpack Ren'Py RPA to ZIP",
		intent:
			"Extract and unpack Ren'Py visual novel archive (.rpa) files into a standard ZIP package directly in your browser. Access game scripts, character sprites, music, and translations without installing Python or command-line tools.",
		faq: [
			{
				q: "Does this require installing Python, unrpa, or command line utilities?",
				a: "No. Unlike traditional Python extraction scripts, this tool parses the Ren'Py archive header, decompresses the pickle index, and unpacks files entirely in your browser using local JavaScript.",
			},
			{
				q: "Are visual novel assets extracted with original quality?",
				a: "Yes. All extracted files (PNG images, OGG/MP3 audio, and script files) are sliced directly from the archive byte streams without any re-encoding or compression loss.",
			},
			{
				q: "Are my visual novel game files uploaded to a remote server?",
				a: "No. All extraction occurs 100% on your device using client-side Web Workers. Your files are never uploaded to any remote server.",
			},
		],
		related: [],
	},
};
