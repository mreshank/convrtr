import type { SectionedPageContent } from "./types";

export const support: SectionedPageContent = {
	title: "Support",
	updated: "17 September 2026",
	sections: [
		{
			eyebrow: "OFFLINE ARCHITECTURE",
			lead: "Runs entirely on your local machine.",
			cont: "No server latency, no network transfer limits.",
			paragraphs: [
				`convrtr is an offline-first instrument. Conversions happen inside
				your browser process using WebAssembly compiled from upstream C, C++,
				and Rust libraries, Web Workers for multi-threading, and hardware-accelerated
				WebCodecs. Your files never leave your device memory.`,
			],
		},
		{
			eyebrow: "BROWSER COMPATIBILITY",
			lead: "Supported browsers and hardware capabilities.",
			cont: "Modern standards for high-performance audio and video.",
			paragraphs: [
				`convrtr supports modern Chromium browsers (Chrome, Edge, Brave, Opera),
				Firefox, and Safari. Multi-threaded codecs like AVIF and JPEG XL utilize
				SharedArrayBuffer and WebAssembly SIMD. If a converter reports missing
				codec support, ensure your browser is up to date with hardware acceleration
				enabled.`,
			],
		},
		{
			eyebrow: "CHROME EXTENSION",
			lead: "Docked Side Panel, Quick Popup, and Viewport Capture.",
			cont: "Native browser integration without server uploads.",
			paragraphs: [
				`The convrtr Chrome Extension (Manifest V3) brings the full 200-tool suite
				directly into your browser workflow. Use the Side Panel dock to convert files
				while you browse, press Command+Shift+Comma (Ctrl+Shift+Comma) for the Quick Popup,
				or press Command+Shift+S to capture visible web pages into the converter.`,
			],
		},
		{
			eyebrow: "LARGE FILE PROCESSING",
			lead: "Handling high-resolution media and batch jobs.",
			cont: "Governed by local RAM rather than arbitrary limits.",
			paragraphs: [
				`Because there are no server queues or cloud bandwidth bottlenecks, file
				size limits are determined strictly by your computer's available memory.
				For gigabyte-scale videos or massive batches, closing unused browser tabs
				ensures maximum memory headroom for the Web Worker pool.`,
			],
		},
		{
			eyebrow: "TROUBLESHOOTING & HELP",
			lead: "Get assistance or report a problem.",
			cont: "Direct issue tracking with the engineering team.",
			paragraphs: [
				`Encountering an unexpected format failure or conversion artifact?
				Report the issue directly at https://github.com/mreshank/convrtr/issues
				with the input file format, browser version, and console log output, or
				visit our /feedback page to submit diagnostic details.`,
			],
		},
	],
};
