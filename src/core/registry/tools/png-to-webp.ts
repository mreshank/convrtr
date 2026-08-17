import { defineImageConversion } from "./image/defineImageConversion";

// Migrated onto `defineImageConversion` so PNG->WebP shares one code path
// with every other image tool instead of hand-rolling its own schema. The
// id ("image/png-to-webp"), slug ("png-to-webp"), and engine id
// ("image:png->webp") are unchanged — a live URL and the e2e suite depend
// on them — and the quality block (`IMAGE_QUALITY_PROFILES.webp`) is the
// original values verbatim, so every existing assertion on preset labels,
// numbers, and explanation strings still holds.
export const pngToWebp = defineImageConversion({
	from: { decoder: "png" },
	to: "webp",
	seo: {
		title: "Convert PNG to WebP — free, private, in your browser | convrtr",
		h1: "Convert PNG to WebP",
		intent:
			"Convert PNG images to WebP without uploading them. The conversion runs inside your browser, so your files never leave your device. Lossless by default.",
		faq: [
			{
				q: "Is WebP lossless?",
				a: "WebP supports both lossless and lossy compression. convrtr defaults to lossless, which typically produces files around 26% smaller than PNG with pixel-identical output.",
			},
			{
				q: "Are my images uploaded anywhere?",
				a: "No. convrtr has no server. The conversion runs in your browser using WebAssembly, and you can confirm it by opening your browser network tab while converting.",
			},
		],
		// The inverse conversion first, then the siblings someone comparing
		// output formats would most plausibly want next.
		related: ["image/webp-to-png", "image/png-to-jpg", "image/png-to-avif"],
	},
});
