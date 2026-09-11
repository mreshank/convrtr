import type { Tool } from "../../types";

export const xpmToPng: Tool = {
	id: "image/xpm-to-png",
	slug: "xpm-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-xpixmap",
			"image/x-xpm",
			"image/xpm",
			"text/x-xpixmap",
			"application/octet-stream",
		],
		ext: ["xpm"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:xpm-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-bit RGBA PNG",
				explanation:
					"Decodes X11 X PixMap (.xpm) C-source color icons, palettes, and transparency masks into standard 32-bit RGBA PNG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "XPM to PNG — Convert X11 X PixMap (.xpm) Icons to PNG | convrtr",
		h1: "Convert X11 XPM to PNG",
		intent:
			"Convert vintage X11 X PixMap (.xpm) C-code color icons, Linux desktop pixmaps, and pixel art into crisp transparent PNG images in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an X11 X PixMap (.xpm) file?",
				a: "XPM is an ASCII text-based image format created in 1989 for the X Window System. It stores color icons as valid C-source syntax (an array of character strings), making it easy to include directly into C/C++ applications and Linux desktop environments like fvwm, Motif, and Window Maker.",
			},
			{
				q: "Does this converter support transparent pixels in XPM?",
				a: "Yes! convrtr parses transparent color assignments (c None or transparent) and preserves full alpha channel transparency in the exported PNG.",
			},
			{
				q: "Does this tool support multi-character color codes?",
				a: "Yes. In larger XPM icons, colors are identified by 2 or more characters per pixel. convrtr parses any chars-per-pixel configuration seamlessly.",
			},
			{
				q: "Are my icons uploaded to a remote server?",
				a: "Never. All text parsing, palette resolution, and PNG compression occur 100% locally in your browser memory.",
			},
		],
		related: ["image/xbm-to-png", "image/tga-to-png", "image/pcx-to-png"],
	},
};
