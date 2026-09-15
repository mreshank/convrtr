import type { Tool } from "../../types";

export const cpcToPng: Tool = {
	id: "image/cpc-to-png",
	slug: "cpc-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-cpc",
			"image/x-cpc-screen",
			"application/x-cpc-screen",
			"application/octet-stream",
		],
		ext: ["cpc", "scr"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:cpc-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic CPC Lossless PNG",
				explanation:
					"Decodes the 16KB Amstrad CPC CRTC 6845 framebuffer screen dump with authentic 27-color Gate Array hardware palette into lossless 32-bit RGBA PNG.",
				params: { mode: 0, aspectCorrection: true },
			},
		],
		advanced: [
			{
				control: "select",
				key: "mode",
				label: "Graphics Mode",
				group: "Display",
				default: "0",
				options: [
					{ value: "0", label: "Mode 0 — 160 × 200 (16 colors)" },
					{ value: "1", label: "Mode 1 — 320 × 200 (4 colors)" },
					{ value: "2", label: "Mode 2 — 640 × 200 (2 colors)" },
				],
			},
			{
				control: "toggle",
				key: "aspectCorrection",
				label: "Aspect Ratio Correction (Mode 0)",
				group: "Display",
				default: true,
			},
		],
	},
	seo: {
		title:
			"CPC to PNG — Convert Amstrad CPC Screen (.cpc, .scr) to PNG Online | convrtr",
		h1: "Convert Amstrad CPC Screen (.cpc, .scr) to PNG",
		intent:
			"Convert vintage Amstrad CPC 464, 664, and 6128 screen dumps (.cpc, .scr) into clean, modern 32-bit RGBA PNG images in your browser. 100% private in-browser decoder with AMSDOS header verification.",
		faq: [
			{
				q: "What is an Amstrad CPC screen dump file?",
				a: "An Amstrad CPC screen file is a 16,384-byte direct memory dump (or 16,512 bytes with a 128-byte AMSDOS tape/disk header) of the video RAM addressed by the Motorola 6845 cathode ray tube controller (CRTC).",
			},
			{
				q: "Which Amstrad CPC graphics modes are supported?",
				a: "convrtr supports all three standard CPC graphics modes: Mode 0 (160×200 with 16 colors), Mode 1 (320×200 with 4 colors), and Mode 2 (640×200 monochrome with 2 colors). Mode 0 images can also be aspect-corrected to 320×200.",
			},
			{
				q: "How are the 27 Amstrad Gate Array colors mapped?",
				a: "The engine maps the CPC hardware palette where each red, green, and blue channel has three discrete levels (0%, 50%, and 100%), producing the iconic 27-color palette accurately rendered in 32-bit RGBA.",
			},
			{
				q: "Are my retro files sent to any server?",
				a: "Never. All decoding, AMSDOS checksum verification, and PNG encoding run entirely client-side in your web browser memory using pure TypeScript.",
			},
		],
		related: [
			"image/zx-to-png",
			"image/art-to-png",
			"image/koa-to-png",
			"image/iff-to-png",
			"image/pcx-to-png",
		],
	},
};
