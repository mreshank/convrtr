import type { Tool } from "../types";

export const rotatePdf: Tool = {
	id: "document/rotate-pdf",
	slug: "rotate-pdf",
	category: "document",
	kind: "edit",
	accept: { mime: ["application/pdf"], ext: ["pdf"] },
	output: { ext: "pdf", mime: "application/pdf" },
	engines: ["pdf:rotate"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Changes each page's rotation entry and nothing else. Text, fonts and images are untouched — the pages are not re-rendered.",
				params: { angle: 90 },
			},
		],
		advanced: [
			{
				control: "select",
				key: "angle",
				label: "Turn by",
				group: "Rotation",
				options: [
					{ value: "90", label: "90° clockwise" },
					{ value: "180", label: "180°" },
					{ value: "270", label: "90° anticlockwise" },
				],
				default: "90",
			},
		],
	},
	seo: {
		title: "Rotate a PDF — lossless, free, in your browser | convrtr",
		h1: "Rotate a PDF",
		intent:
			"Turn every page of a PDF by 90, 180 or 270 degrees without uploading it. Only the rotation setting changes, so nothing is re-rendered. Runs entirely in your browser.",
		faq: [
			{
				q: "Does rotating reduce quality?",
				a: "No, and it barely changes the file. Every PDF page carries a rotation entry saying how far to turn it when displayed, so rotating means editing one number per page. The text, fonts and images are untouched. Tools that rasterise each page to rotate it hand back a document that looks right and has lost all its selectable text — a steep price for a quarter turn.",
			},
			{
				q: "My pages were already sideways. What happens?",
				a: "The turn is added to the rotation already there, which is what a scanned document needs. Scans often arrive at 90 or 270 degrees, and a tool that replaced the value rather than adding to it would seem fine on ordinary files and do the wrong thing on exactly the ones you are trying to fix. convrtr tells you when it found pages that were already rotated.",
			},
			{
				q: "Can I rotate just one page?",
				a: "Not with this tool — it turns every page by the same amount. For a single page, split the PDF first, rotate the page you want, and merge the result back together.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab — or by going offline first.",
			},
		],
		related: ["document/merge-pdf", "document/split-pdf", "image/jpg-to-pdf"],
	},
};
