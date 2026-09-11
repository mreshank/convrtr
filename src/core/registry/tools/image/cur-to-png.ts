import type { Tool } from "../../types";

export const curToPng: Tool = {
	id: "image/cur-to-png",
	slug: "cur-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-icon",
			"image/x-cur",
			"image/vnd.microsoft.icon",
			"application/octet-stream",
		],
		ext: ["cur"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:cur-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Universal Transparent PNG",
				explanation:
					"Decodes Windows static cursor (.cur) binary files across 1bpp monochrome, 4bpp, 8bpp paletted, 24bpp RGB, and 32bpp true-color RGBA formats, accurately resolving 1-bit AND transparency masks and embedded PNG payloads into pristine transparent PNG images with preserved hotspot coordinates.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CUR to PNG — Convert Windows Cursor (.cur) to Transparent PNG Online | convrtr",
		h1: "Convert Windows Cursor to Transparent PNG",
		intent:
			"Convert Windows static mouse cursor (.cur) files into high-resolution transparent PNG images directly in your browser. Compatible with Figma, Photoshop, CSS web cursors, macOS Mousecape, and Linux. 100% private with zero server uploads.",
		faq: [
			{
				q: "How does .cur differ from standard .ico icon files?",
				a: "While both share a similar container structure, .cur files specify resource type 2 instead of 1. In place of color planes and bits per pixel in directory entries, .cur files define exact X and Y hotspot coordinates that determine which specific pixel registers mouse clicks.",
			},
			{
				q: "How are 1-bit monochrome and paletted cursors rendered?",
				a: "Classic Windows cursors combine an XOR color bitmap with a 1-bit AND transparency mask. convrtr evaluates both masks per-pixel, accurately converting transparent bits to an alpha channel of 0 while preserving inverted edges and crisp pixel art.",
			},
			{
				q: "Can I use the exported PNG as a custom cursor on my website?",
				a: "Yes! Modern web browsers support custom CSS mouse pointers. You can reference your converted PNG in CSS via: cursor: url('cursor.png') X Y, auto;, using the hotspot pixel coordinates from your cursor.",
			},
			{
				q: "Are my files uploaded to any external server?",
				a: "No. convrtr decodes and renders all cursor bitmaps entirely in-memory using client-side WebAssembly and JavaScript. No files ever leave your device.",
			},
		],
		related: ["image/ani-to-png", "image/icns-to-png", "image/abr-to-png"],
	},
};
