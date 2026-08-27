import type { Tool } from "../types";

export const faviconPack: Tool = {
	id: "image/favicon-generator",
	slug: "favicon-generator",
	category: "image",
	kind: "generate",
	accept: {
		mime: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/avif"],
		ext: ["png", "jpg", "jpeg", "webp", "avif"],
	},
	output: { ext: "zip", mime: "application/zip" },
	engines: ["image:favicon-pack"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Every icon is written as a losslessly compressed PNG. Resizing still resamples, as it must.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "Favicon generator — every size your site needs | convrtr",
		h1: "Generate a favicon set",
		intent:
			"Drop in one square image and get back the icon set a site actually needs: 16 and 32 pixel favicons, a 180 pixel Apple touch icon, and the 192 and 512 pixel icons the web app manifest calls for — plus the manifest fragment and the HTML to paste into your head. Every size is resampled from your original with Lanczos3, not scaled down repeatedly from one intermediate. It runs in your browser; the image is never uploaded.",
		faq: [
			{
				q: "Why only five sizes? Other generators produce fifteen.",
				a: "The extra sizes target long-obsolete iOS versions. Shipping 57, 60, 72, 76, 114, 120 and 144 pixel icons makes the download bigger and your HTML noisier for no practical gain on any browser in current use. These five cover desktop tabs, iOS home screens, and the manifest spec.",
			},
			{
				q: "Do I need an .ico file?",
				a: "Not any more. Every browser in current use accepts PNG favicons via a link tag. ICO only matters if you must support Internet Explorer.",
			},
			{
				q: "What should I feed it?",
				a: "A square image, ideally 512 pixels or larger. Anything smaller gets upscaled for the 512 icon, and upscaling cannot invent detail that was never there. Simple, high-contrast artwork survives being shrunk to 16 pixels far better than a detailed photograph.",
			},
			{
				q: "What is in the ZIP?",
				a: "The five PNG icons, a site.webmanifest fragment listing the two manifest icons, and a head-snippet.html with the link tags to paste into your page head. Generating icons without telling you how to reference them leaves the job half done.",
			},
		],
		related: ["image/resize-png", "image/png-to-webp", "image/compress-jpg"],
	},
};
