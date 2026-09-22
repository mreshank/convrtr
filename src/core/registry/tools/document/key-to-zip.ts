import type { Tool } from "../../types";

export const keyToZip: Tool = {
	id: "document/key-to-zip",
	slug: "key-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/x-iwork-keynote-sffkey",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["key"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["extract:iwork-preview-to-zip"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Preview Extract",
				explanation:
					"Pulls the rendered slide preview Keynote itself paints for Open Recent, Quick Look and Spotlight — bit-exact, no re-render, no loss.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "KEY to ZIP — Extract the Preview Without a Mac | convrtr",
		h1: "Extract the Preview From an Apple Keynote (.key) File",
		intent:
			"See a Keynote deck without Keynote or a Mac. A modern .key file is a ZIP whose body is Apple's private protobuf, but which embeds the rendered slide preview the app itself displays. This tool pulls that preview out bit-exact into a ZIP so the slides are viewable on Windows, Linux, Android or iOS — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "Why can't I just convert .key to PDF like other sites?",
				a: "The .key body is Apple's proprietary IWA protobuf — no tool honestly re-renders all slides. What every Keynote file does contain is the rendered deck preview the app paints, and that preview is what you get here, bit-exact.",
			},
			{
				q: "What's inside the extracted ZIP?",
				a: "preview.jpg (or preview.png / preview.pdf, matching what the file embeds) plus the Quick Look render (quicklook.pdf and thumbnail.png) when present, and a short _README.txt explaining what was extracted.",
			},
			{
				q: "Can I still edit the presentation?",
				a: "No — this extracts the preview render, not an editable deck. Editing the .key body needs Keynote or a converter that reads Apple's private IWA format.",
			},
			{
				q: "Is my Keynote file uploaded anywhere?",
				a: "No. Unzipping and preview extraction run entirely inside your browser.",
			},
		],
		related: [
			"document/pages-to-zip",
			"image/procreate-to-png",
			"document/mbox-to-zip",
		],
	},
};
