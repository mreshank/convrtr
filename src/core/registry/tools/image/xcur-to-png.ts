import type { Tool } from "../../types";

export const xcurToPng: Tool = {
	id: "image/xcur-to-png",
	slug: "xcur-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-xcursor",
			"application/x-xcursor",
			"image/xcur",
			"application/octet-stream",
		],
		ext: ["xcur", "cursor"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:xcur-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full-Res Transparent PNG",
				explanation:
					"Extracts X11 cursor frames with alpha channel un-premultiplication into transparent 32-bit RGBA PNG with hotspot coordinates preserved.",
				params: {},
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "size",
				label: "Nominal Size (px)",
				group: "Resolution",
				min: 16,
				max: 128,
				step: 8,
				default: 0,
			},
		],
	},
	seo: {
		title:
			"XCUR to PNG — Convert X11 Mouse Cursor (.xcur) to PNG Online | convrtr",
		h1: "Convert X11 Mouse Cursor (.xcur) to PNG",
		intent:
			"Convert Linux and Unix X11 Xcursor mouse pointer files (.xcur, .cursor) into clean, transparent 32-bit RGBA PNG images directly in your browser. 100% private in-browser extractor with alpha un-premultiplication.",
		faq: [
			{
				q: "What is an X11 Xcursor (.xcur) file?",
				a: "Xcursor is the standard mouse cursor theme format used across X11 and Wayland desktop environments on Linux and BSD (including GNOME, KDE Plasma, XFCE). It stores multi-resolution alpha-blended ARGB raster frames and hotspot coordinates.",
			},
			{
				q: "Why convert X11 cursor files to PNG?",
				a: "Windows, macOS, design tools like Figma, and web browsers cannot natively open or preview raw Xcursor binaries. Converting to PNG produces a universal transparent graphic you can inspect, edit, or repurpose as a web cursor.",
			},
			{
				q: "How does the in-browser Xcursor decoder work?",
				a: "convrtr verifies the 4-byte 'Xcur' magic, navigates the table of contents to locate high-resolution image chunks, un-premultiplies the 32-bit ARGB color channels, and encodes the pixels into a standard 32-bit RGBA PNG image.",
			},
			{
				q: "Are my cursor files uploaded to any server?",
				a: "Never. All parsing, un-premultiplication, and PNG compression execute 100% locally in your web browser memory using client-side TypeScript.",
			},
		],
		related: [
			"image/cur-to-png",
			"image/ani-to-png",
			"image/icns-to-png",
			"image/ico-to-png",
		],
	},
};
