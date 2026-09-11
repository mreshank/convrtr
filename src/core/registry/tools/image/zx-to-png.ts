import type { Tool } from "../../types";

export const zxToPng: Tool = {
	id: "image/zx-to-png",
	slug: "zx-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/x-spectrum-screen",
			"application/x-zx-screen",
			"image/x-spectrum",
			"application/octet-stream",
		],
		ext: ["scr"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:zx-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Authentic 256 × 192 Lossless PNG",
				explanation:
					"Decodes the 6,912-byte Sinclair ZX Spectrum screen memory buffer and 8x8 character cell attributes into lossless 32-bit RGBA PNG.",
				params: { scale: "1" },
			},
			{
				id: "visually-lossless",
				label: "2x Crisp Integer Scale (512 × 384)",
				explanation:
					"Scales each retro pixel by 2x nearest-neighbor for sharp display on modern high-DPI screens.",
				params: { scale: "2" },
			},
		],
		advanced: [
			{
				control: "select",
				key: "scale",
				label: "Output Resolution Scale",
				group: "Display",
				default: "1",
				options: [
					{ value: "1", label: "1x Native (256 × 192)" },
					{ value: "2", label: "2x Scaled (512 × 384)" },
					{ value: "3", label: "3x Scaled (768 × 576)" },
					{ value: "4", label: "4x Scaled (1024 × 768)" },
				],
			},
			{
				control: "toggle",
				key: "invertColors",
				label: "Invert Ink & Paper Colors",
				group: "Color",
				default: false,
			},
		],
	},
	seo: {
		title:
			"ZX Spectrum to PNG — Convert Sinclair ZX Spectrum Screen (.scr) to PNG | convrtr",
		h1: "Convert Sinclair ZX Spectrum Screen (.scr) to PNG",
		intent:
			"Convert classic Sinclair ZX Spectrum 8-bit screen dumps and game loading screens (.scr) into clean, lossless 32-bit RGBA PNG images directly in your browser. 100% private in-browser decoder.",
		faq: [
			{
				q: "What is a ZX Spectrum .scr file?",
				a: "A .scr file is a direct 6,912-byte snapshot of the video display memory (VRAM) of a Sinclair ZX Spectrum personal computer. It consists of 6,144 bytes of monochrome bitmap pixels arranged across three screen thirds, followed by 768 attribute bytes describing the ink, paper, brightness, and flash for each 8x8 character block.",
			},
			{
				q: "Why convert ZX Spectrum .scr files to PNG?",
				a: "Standard modern operating systems, web browsers, and image viewing apps cannot open or render raw 8-bit ZX Spectrum screen dumps. Converting to PNG produces a universal lossless image you can share, print, or edit in Photoshop and Figma.",
			},
			{
				q: "How are the iconic Sinclair colors handled?",
				a: "convrtr accurately renders the 16 Sinclair palette colors (8 standard intensity and 8 bright intensity) according to each character block's attribute byte, preserving authentic 1980s retro game aesthetic.",
			},
			{
				q: "Are my vintage files uploaded to an external server?",
				a: "Never. All ZX Spectrum VRAM interlacing and PNG encoding execute 100% locally in your web browser memory using pure TypeScript. No data ever leaves your computer.",
			},
		],
		related: [
			"image/macpaint-to-png",
			"image/tim-to-png",
			"image/iff-to-png",
			"image/pcx-to-png",
		],
	},
};
