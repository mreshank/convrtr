import type { Tool } from "../../types";

export const webarchiveToHtml: Tool = {
	id: "document/webarchive-to-html",
	slug: "webarchive-to-html",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/x-webarchive", "application/octet-stream"],
		ext: ["webarchive"],
	},
	output: { ext: "html", mime: "text/html" },
	engines: ["extract:webarchive-to-html"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Universal Offline HTML",
				explanation:
					"Parses Apple Safari binary property list (bplist00) web archives, extracts the main HTML document, and inlines all embedded images, CSS stylesheets, and web assets into base64 Data URLs, creating a standalone HTML document that opens in any browser on Windows, Linux, Android, and ChromeOS.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"WebArchive to HTML — Convert Apple Safari .webarchive to Standalone HTML Online | convrtr",
		h1: "Convert Safari WebArchive to Standalone HTML",
		intent:
			"Convert Apple macOS and iOS Safari .webarchive files into standalone, offline HTML pages directly in your browser. Inlines all images and CSS stylesheets with zero external dependencies. 100% private with zero server uploads.",
		faq: [
			{
				q: "Why can't Windows, Android, or Chrome open .webarchive files?",
				a: "Apple Safari saves web pages using Apple's proprietary Binary Property List (bplist00) container format. Non-Apple platforms and browsers do not have built-in bplist decoders and cannot read the embedded HTML or assets directly.",
			},
			{
				q: "Will images, styling, and graphics be preserved?",
				a: "Yes! convrtr extracts all subresources (JPEG, PNG, WebP, SVG images, CSS files) from the archive's WebSubresources collection and converts them into inline base64 Data URLs directly inside the HTML markup. The resulting file works completely offline without any internet connection.",
			},
			{
				q: "Can I open the converted HTML file on any device?",
				a: "Yes. The exported file is standard, universal W3C HTML5. You can open it in Google Chrome, Microsoft Edge, Mozilla Firefox, Opera, or any mobile browser on Windows, Linux, Android, or macOS.",
			},
			{
				q: "Are my archived pages or personal documents uploaded to a server?",
				a: "No. The Apple binary property list parser and HTML compiler run entirely in-memory within your browser. Not a single byte of your web pages, articles, receipts, or personal documents is ever sent across the network.",
			},
		],
		related: ["document/mhtml-to-html", "document/msg-to-eml"],
	},
};
