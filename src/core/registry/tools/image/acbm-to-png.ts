import type { Tool } from "../../types";

export const acbmToPng: Tool = {
	id: "image/acbm-to-png",
	slug: "acbm-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-acbm",
			"image/acbm",
			"image/x-iff",
			"application/octet-stream",
		],
		ext: ["acbm"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:acbm-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Image",
				explanation:
					"Decodes Commodore Amiga Continuous Bitmap (ACBM) non-interleaved planar images into modern 32-bit RGBA PNG files. Supports 1-8 bitplanes, 24-bit TrueColor, transparency masks, and ByteRun1 compression.",
				params: {
					preserveAlpha: true,
				},
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "preserveAlpha",
				label: "Preserve Alpha & Transparency",
				group: "Transparency",
				default: true,
			},
		],
	},
	seo: {
		title:
			"ACBM to PNG — Convert Amiga Continuous Bitmap (.acbm) to PNG | convrtr",
		h1: "Convert Amiga Continuous Bitmap (.acbm) to Lossless PNG",
		intent:
			"Convert Commodore Amiga Continuous Bitmap (.acbm) IFF images, retro game sprites, and demoscene planar graphics into lossless 32-bit RGBA PNG files directly in your browser. 100% private client-side conversion.",
		faq: [
			{
				q: "What is an ACBM (.acbm) file?",
				a: "ACBM (Amiga Continuous BitMap) is a raster graphics sub-format of Electronic Arts' Interchange File Format (IFF). Unlike standard ILBM which interleaves bitplanes line-by-line, ACBM stores each bitplane as a contiguous, uninterrupted block of memory inside an ABMP chunk, optimized for direct Amiga Blitter DMA transfers.",
			},
			{
				q: "How does ACBM differ from standard Amiga IFF-ILBM?",
				a: "In standard ILBM, scanlines alternate across bitplanes (Plane 0 Row 0, Plane 1 Row 0, etc.). In ACBM, each plane is contiguous (all rows for Plane 0, followed by all rows for Plane 1). This eliminates scanline de-interleaving overhead when copying graphics directly to chip RAM.",
			},
			{
				q: "Does this converter support ByteRun1 compression and masks?",
				a: "Yes. convrtr handles uncompressed and ByteRun1 RLE compressed ACBM images, arbitrary bit depths from 1 to 8 planes (up to 256 colors via CMAP) as well as 24-bit RGB truecolor planar arrays and transparency mask planes.",
			},
			{
				q: "Are my retro images uploaded to any external server?",
				a: "Never. All ByteRun1 decompression, planar recombination, color palette lookup, and PNG encoding execute 100% locally inside your browser memory with zero server uploads.",
			},
		],
		related: [
			"image/iff-to-png",
			"image/art-to-png",
			"image/koa-to-png",
			"image/pcx-to-png",
			"image/tga-to-png",
		],
	},
};
