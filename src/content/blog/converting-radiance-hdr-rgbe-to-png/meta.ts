import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-radiance-hdr-rgbe-to-png",
	title:
		"Converting Radiance HDR (RGBE) to PNG: Floating-Point Tone Mapping Architecture",
	description:
		"Explore Greg Ward's Radiance 32-bit RGBE (.hdr) architecture. Learn how shared exponents, adaptive RLE scanlines, Reinhard tone reproduction, and sRGB gamma curves decode in browser memory.",
	publishedAt: "2026-09-13",
	tags: ["graphics", "hdr", "rgbe", "png", "vfx", "gameready"],
	relatedTools: [
		"image/hdr-to-png",
		"image/dds-to-png",
		"image/tga-to-png",
		"image/qoi-to-png",
	],
	bodyFormat: "mdx",
};
