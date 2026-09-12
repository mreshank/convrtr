import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-c64-art-studio-to-png",
	title:
		"Converting C64 Advanced Art Studio (.art) to PNG: Commodore 64 Bitmap Recovery",
	description:
		"Explore Oxford Computer Systems' 1986 Advanced Art Studio graphics format. Learn how Commodore 64 Hires and Multicolor bitplane structures, Screen RAM, Color RAM, and the authentic VIC-II palette decode into 32-bit RGBA PNG.",
	publishedAt: "2026-09-13",
	tags: ["image", "c64", "pixelart", "retro", "artstudio", "png"],
	relatedTools: [
		"image/art-to-png",
		"image/koa-to-png",
		"image/neo-to-png",
		"image/degas-to-png",
		"image/zx-to-png",
	],
	bodyFormat: "mdx",
};
