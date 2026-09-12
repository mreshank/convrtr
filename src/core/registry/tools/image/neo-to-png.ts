import type { Tool } from "../../types";

export const neoToPng: Tool = {
	id: "image/neo-to-png",
	slug: "neo-to-png",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/x-neochrome",
			"image/neochrome",
			"application/x-neochrome",
			"application/octet-stream",
		],
		ext: ["neo"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:neo-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless 32-Bit RGBA PNG",
				explanation:
					"Converts 4-bitplane planar Atari ST NeoChrome graphics and 12-bit hardware palettes into crystal-clear 32-bit RGBA PNG with aspect ratio correction.",
				params: { aspectCorrect: true },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "aspectCorrect",
				label: "Correct Medium-Res Aspect Ratio (640x400)",
				group: "Display",
				default: true,
			},
		],
	},
	seo: {
		title:
			"NEO to PNG — Convert Atari ST NeoChrome (.neo) to PNG Online | convrtr",
		h1: "Convert Atari ST NeoChrome (.neo) to PNG",
		intent:
			"Convert vintage Atari ST NeoChrome (.neo) graphics into pixel-perfect 32-bit RGBA PNG images directly in your browser. 100% private client-side planar bitplane decoding with zero server uploads.",
		faq: [
			{
				q: "What is an Atari ST NeoChrome (.neo) file?",
				a: "NeoChrome (.neo) was the flagship paint software created by Dave Staugas at Atari Corp in 1985. It is a 32,128-byte uncompressed image format consisting of a 128-byte header (storing resolution, color cycling tables, and 16 Atari ST 12-bit RGB palette colors) followed by 32,000 bytes of planar screen memory.",
			},
			{
				q: "Why convert NeoChrome pictures to PNG?",
				a: "Modern operating systems and image viewers do not support Atari ST 4-bitplane graphics formats. Converting .neo files to PNG extracts the pixel data and color palette, allowing retro pixel art, scene demos, and classic game title screens to be displayed and preserved anywhere.",
			},
			{
				q: "How does the in-browser bitplane decoder work?",
				a: "The converter reads the 128-byte NeoChrome header, decodes the 16-color Atari ST palette (converting 3-bit and STE 4-bit color components to standard 8-bit sRGB), and transforms interleaved 16-pixel word bitplanes into continuous chunky 32-bit RGBA pixel buffers.",
			},
			{
				q: "Are my retro pictures uploaded to a cloud server?",
				a: "Never. All decoding, color mapping, and PNG encoding execute entirely client-side inside your browser's local memory. Your files are never uploaded or stored on any server.",
			},
		],
		related: [
			"image/degas-to-png",
			"image/iff-to-png",
			"image/koa-to-png",
			"image/pcx-to-png",
		],
	},
};
