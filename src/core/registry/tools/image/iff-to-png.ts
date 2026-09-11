import type { Tool } from "../../types";

export const iffToPng: Tool = {
	id: "image/iff-to-png",
	slug: "iff-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"image/x-iff",
			"image/x-ilbm",
			"image/ilbm",
			"application/x-ilbm",
			"application/octet-stream",
		],
		ext: ["iff", "ilbm", "lbm"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:iff-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless PNG Image",
				explanation:
					"Decodes Commodore Amiga & Electronic Arts IFF-ILBM interleaved bitmap images into modern 32-bit RGBA PNG files. Supports 1-8 bitplanes, Extra Half-Brite (EHB), Hold-And-Modify (HAM6), 24-bit TrueColor, and ByteRun1 RLE compression.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"IFF to PNG — Convert Commodore Amiga & Deluxe Paint IFF-ILBM Images to PNG | convrtr",
		h1: "Convert Amiga IFF-ILBM to Lossless PNG",
		intent:
			"Convert vintage Commodore Amiga and Deluxe Paint IFF, ILBM, and LBM bitmap graphics, retro game art, and demoscene textures into lossless PNG images directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is an IFF-ILBM (.iff / .ilbm / .lbm) file?",
				a: "ILBM (InterLeaved BitMap) is a raster graphics sub-format of Electronic Arts' Interchange File Format (IFF). Introduced in 1985 on Commodore Amiga computers with Deluxe Paint, it became the gold standard for retro 16-bit graphics and demoscene artwork.",
			},
			{
				q: "Does convrtr support Amiga-specific display modes like EHB and HAM?",
				a: "Yes! convrtr fully implements Amiga OCS/ECS display modes including Extra Half-Brite (EHB 64-color mode), Hold-And-Modify (HAM6 4096-color mode), mask planes, and 24-bit TrueColor ILBMs.",
			},
			{
				q: "What is the difference between ILBM and PBM?",
				a: "ILBM stores pixel bits across separate planar bitplanes, matching the Amiga's native Denise graphics hardware. PBM (Packed BitMap) stores pixels chunky (1 byte per pixel) for MS-DOS Deluxe Paint.",
			},
			{
				q: "Are my retro graphics uploaded to any cloud server?",
				a: "Never. All ByteRun1 decompression, bitplane reassembly, and PNG encoding run 100% locally in your browser memory.",
			},
		],
		related: ["image/pcx-to-png", "image/aseprite-to-png", "image/tga-to-png"],
	},
};
