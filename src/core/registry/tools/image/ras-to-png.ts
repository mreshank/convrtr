import type { Tool } from "../../types";

export const rasToPng: Tool = {
	id: "image/ras-to-png",
	slug: "ras-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-sun-raster",
			"image/x-raster",
			"image/sun-raster",
			"application/x-sun-raster",
			"application/octet-stream",
		],
		ext: ["ras", "sun", "rast"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:ras-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-bit RGBA PNG",
				explanation:
					"Decodes Sun Raster (.ras, .sun) Unix workstation bitmaps, colormaps, and RLE streams into standard 32-bit RGBA PNG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"Sun Raster to PNG — Convert Sun (.ras, .sun) Images to PNG | convrtr",
		h1: "Convert Sun Raster (.ras, .sun) to PNG",
		intent:
			"Convert vintage Sun Microsystems Sun Raster (.ras, .sun, .rast) Unix workstation images, scientific datasets, and retro bitmaps to crisp lossless PNG in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a Sun Raster (.ras, .sun) file?",
				a: "Sun Raster is a graphical bitmap format developed by Sun Microsystems for SunOS and Solaris workstations in the late 1980s and 1990s. Widely used in OpenWindows, astronomical observatories, satellite imaging, and retro Unix software, it stores uncompressed or RLE-compressed 1-bit, 8-bit, 24-bit, or 32-bit raster graphics.",
			},
			{
				q: "What Sun Raster types and bit depths does convrtr support?",
				a: "convrtr supports standard (RT_STANDARD), legacy (RT_OLD), RGB format (RT_FORMAT_RGB), and run-length encoded (RT_BYTE_ENCODED) Sun Raster files across 1-bit monochrome, 8-bit indexed palette (RMT_EQUAL_RGB), 24-bit BGR/RGB truecolor, and 32-bit raster depths.",
			},
			{
				q: "How does 16-bit scanline word alignment work?",
				a: "Sun Raster mandates that every raster scanline is padded to an even 16-bit (2-byte) boundary. convrtr accurately calculates row strides and discards padding bytes to ensure pixel-perfect rendering without slanted or corrupted rows.",
			},
			{
				q: "Are my files uploaded to any server?",
				a: "Never. Binary parsing, RLE decompression, palette resolution, and PNG generation happen entirely in your browser memory.",
			},
		],
		related: [
			"image/xpm-to-png",
			"image/xbm-to-png",
			"image/pcx-to-png",
			"image/iff-to-png",
		],
	},
};
