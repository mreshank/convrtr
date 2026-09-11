import type { Tool } from "../../types";

export const xbmToPng: Tool = {
	id: "image/xbm-to-png",
	slug: "xbm-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-xbitmap",
			"image/xbm",
			"image/x-xbm",
			"text/plain",
			"application/octet-stream",
		],
		ext: ["xbm", "bm"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:xbm-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Image",
				explanation:
					"Decodes monochrome X11 X BitMap (.xbm) C source code arrays used in embedded Arduino, ESP32, and OLED displays into crisp transparent 32-bit RGBA PNG files.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"XBM to PNG — Convert X11 & Arduino X BitMap (.xbm) to PNG | convrtr",
		h1: "Convert X BitMap to Lossless PNG",
		intent:
			"Convert X11 X BitMap (.xbm) C source code headers, embedded Arduino / ESP32 OLED splash screens, and retro Unix icons into standard transparent PNG images directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an X BitMap (.xbm) file?",
				a: "An XBM file is a plain-text monochrome bitmap format defined as valid C programming language source code with width, height, and a static byte array, widely used in X11 Window System and embedded microcontrollers (SSD1306, u8g2).",
			},
			{
				q: "How are pixels encoded in an XBM file?",
				a: "XBM packs 1-bit pixels into bytes using least-significant-bit (LSB) first ordering. Set bits (1) represent foreground pixels, and unset bits (0) represent background pixels.",
			},
			{
				q: "Why convert XBM to PNG?",
				a: "Modern graphic design software (Photoshop, Figma, Canva) and modern web browsers cannot open raw XBM C-header files. Converting to PNG allows instant visual verification, asset sharing, and editing.",
			},
			{
				q: "Are my embedded graphics or code uploaded to any server?",
				a: "Never. All text parsing, bit-shifting, and PNG encoding run entirely inside your browser memory with zero network requests.",
			},
		],
		related: ["image/pcx-to-png", "image/iff-to-png", "image/tga-to-png"],
	},
};
