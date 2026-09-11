import type { Tool } from "../../types";

export const sgiToPng: Tool = {
	id: "image/sgi-to-png",
	slug: "sgi-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-sgi",
			"image/sgi",
			"image/x-rgb",
			"image/rgb",
			"application/x-sgi",
			"application/octet-stream",
		],
		ext: ["sgi", "rgb", "rgba", "bw", "iris"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:sgi-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-bit RGBA PNG",
				explanation:
					"Decodes Silicon Graphics SGI (.rgb, .rgba, .sgi, .bw) Iris workstation bitmaps, RLE streams, and alpha channels into standard 32-bit RGBA PNG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SGI to PNG — Convert Silicon Graphics (.rgb, .rgba, .sgi, .bw) to PNG | convrtr",
		h1: "Convert SGI / Iris Images to PNG",
		intent:
			"Convert vintage Silicon Graphics IRIX (.rgb, .rgba, .sgi, .bw) 3D textures, Maya/Softimage frames, and retro workstation graphics into crisp lossless PNG in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an SGI / Iris (.rgb, .sgi) image file?",
				a: "The SGI image format (also known as Iris RGB) was created by Silicon Graphics in the 1980s for IRIX Unix workstations. It became the industry standard graphic format for early OpenGL, 3D computer graphics software (Maya, Alias PowerAnimator, Softimage 3D), Nintendo 64 developer SDKs, and Hollywood film visual effects in the 1990s.",
			},
			{
				q: "What SGI file extensions and channels does convrtr support?",
				a: "convrtr supports all standard SGI channel configurations: 1-channel B/W grayscale (.bw), 2-channel grayscale with alpha, 3-channel RGB truecolor (.rgb, .sgi), and 4-channel RGBA truecolor with alpha (.rgba, .sgi), across both uncompressed and RLE-compressed formats at 8-bit and 16-bit channel depths.",
			},
			{
				q: "Why do SGI images often open upside down in older viewers?",
				a: "SGI Iris files store raster scanlines from bottom-to-top (row 0 is at the bottom of the image). convrtr automatically inverts the vertical scanline sequence to ensure standard top-to-bottom PNG rendering without upside-down artifacts.",
			},
			{
				q: "Are my 3D assets or textures uploaded to a server?",
				a: "Never. All 512-byte header parsing, planar channel recombination, RLE decompression, and PNG compression occur 100% locally in your browser memory.",
			},
		],
		related: [
			"image/ras-to-png",
			"image/tga-to-png",
			"image/iff-to-png",
			"image/vtf-to-png",
		],
	},
};
