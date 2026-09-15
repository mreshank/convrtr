import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-amstrad-cpc-screen-dumps-to-png",
	title:
		"Converting Amstrad CPC Screen Dumps to PNG: CRTC 6845 Framebuffer Decoding",
	description:
		"Discover how the Amstrad CPC 464, 664, and 6128 video architecture works. Learn how CRTC scanline addressing, Gate Array bitplane interleaving, and 27-color palettes decode into modern PNG images.",
	publishedAt: "2026-09-15",
	tags: ["image", "cpc", "amstrad", "png", "retro", "graphics"],
	relatedTools: [
		"image/cpc-to-png",
		"image/zx-to-png",
		"image/art-to-png",
		"image/koa-to-png",
		"image/iff-to-png",
	],
	bodyFormat: "mdx",
};
