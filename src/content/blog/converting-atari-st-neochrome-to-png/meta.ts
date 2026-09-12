import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-atari-st-neochrome-to-png",
	title:
		"Converting Atari ST NeoChrome (.neo) to PNG: Planar Bitplane Graphics Decoding",
	description:
		"Explore Dave Staugas's Atari ST NeoChrome (.neo) graphics format. Learn how 128-byte headers, 12-bit hardware palettes, 4-bitplane planar RAM, and aspect correction decode to 32-bit RGBA PNG.",
	publishedAt: "2026-09-13",
	tags: ["atari", "retro", "neochrome", "pixelart", "graphics", "png"],
	relatedTools: [
		"image/neo-to-png",
		"image/degas-to-png",
		"image/iff-to-png",
		"image/koa-to-png",
	],
	bodyFormat: "mdx",
};
