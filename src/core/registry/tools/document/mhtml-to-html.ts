import type { Tool } from "../../types";

export const mhtmlToHtml: Tool = {
	id: "document/mhtml-to-html",
	slug: "mhtml-to-html",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"multipart/related",
			"message/rfc822",
			"application/x-mimearchive",
			"application/octet-stream",
		],
		ext: ["mhtml", "mht"],
	},
	output: { ext: "html", mime: "text/html" },
	engines: ["extract:mhtml-to-html"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Inlined Standalone HTML",
				explanation:
					"Extracts all embedded images, CSS styles, and fonts from the MHTML multipart container and inlines them as base64 data URLs for 100% offline standalone compatibility.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"MHTML to HTML — Convert .mhtml & .mht to Standalone HTML Online | convrtr",
		h1: "Convert MHTML & MHT to Standalone HTML",
		intent:
			"Convert MHTML web archives (.mhtml, .mht) into standard standalone HTML documents directly in your browser. Open Chrome and Edge saved web pages on Mac, Safari, iPhone, Android, or Linux with all images inlined and zero server uploads.",
		faq: [
			{
				q: "Why can't Safari or mobile browsers open .mhtml files?",
				a: "MHTML is a Microsoft/Chromium web archive standard that packages web pages and images into an RFC 2557 MIME multipart wrapper. Apple Safari, iOS, and Android web viewers do not support MHTML natively. Converting to a standard HTML file with inlined base64 data URLs allows the page to display identically on any device.",
			},
			{
				q: "Will images, styling, and fonts be preserved?",
				a: "Yes. All images, stylesheets, and assets bundled inside the MHTML file are decoded and inlined directly into the HTML document as base64 data URIs.",
			},
			{
				q: "Does this work completely offline without an internet connection?",
				a: "Yes. Once the page is loaded, the conversion executes 100% locally in your browser memory. The resulting HTML file contains all assets embedded within itself, requiring no external network requests to view.",
			},
			{
				q: "Is my saved web page uploaded to any server?",
				a: "No. All MIME multipart parsing and data URL synthesis happens client-side in your browser. Nothing is ever sent to a remote server.",
			},
		],
		related: ["document/xmind-to-markdown"],
	},
};
