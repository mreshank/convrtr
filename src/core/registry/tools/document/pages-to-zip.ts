import type { Tool } from "../../types";

export const pagesToZip: Tool = {
	id: "document/pages-to-zip",
	slug: "pages-to-zip",
	category: "document",
	kind: "extract",
	accept: {
		mime: [
			"application/x-iwork-pages-sffpages",
			"application/zip",
			"application/octet-stream",
		],
		ext: ["pages"],
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
					"Pulls the full-page render Pages itself paints into Open Recent, Quick Look and Spotlight — bit-exact, no re-render, no loss.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "PAGES to ZIP — Extract the Preview Without a Mac | convrtr",
		h1: "Extract the Preview From an Apple Pages (.pages) File",
		intent:
			"Open a .pages document without Pages or a Mac. A modern Pages file is a ZIP whose body is Apple's private protobuf, but which embeds the rendered page preview the app itself displays. This tool pulls that preview out bit-exact into a ZIP so the page is readable on Windows, Linux, Android or iOS — entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "Why can't I just convert .pages to PDF like other sites?",
				a: "The .pages body is Apple's proprietary IWA protobuf — no tool honestly re-renders it. What every .pages file does contain is the page preview Pages itself paints, and that preview is what you get here, bit-exact.",
			},
			{
				q: "What's inside the extracted ZIP?",
				a: "preview.jpg (or preview.png / preview.pdf, matching what the file embeds) plus the Quick Look render (quicklook.pdf and thumbnail.png) when present, and a short _README.txt explaining what was extracted.",
			},
			{
				q: "I have a Pages file from before 2013 — will this work?",
				a: "Only for the modern ZIP-container format. Very old Pages documents used a directory bundle format which is not supported.",
			},
			{
				q: "Is my Pages document uploaded anywhere?",
				a: "No. Unzipping and preview extraction run entirely inside your browser.",
			},
		],
		related: [
			"document/key-to-zip",
			"image/procreate-to-png",
			"document/mbox-to-zip",
		],
	},
};
