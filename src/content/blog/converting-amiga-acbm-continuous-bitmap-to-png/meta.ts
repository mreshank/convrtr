import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-amiga-acbm-continuous-bitmap-to-png",
	title:
		"Converting Amiga ACBM to PNG: Continuous Planar Bitmaps and Blitter DMA",
	description:
		"Explore the Commodore Amiga Continuous Bitmap (ACBM) format. Learn how non-interleaved planar memory, ByteRun1 RLE decompression, and 24-bit TrueColor planes convert into lossless modern PNG images.",
	publishedAt: "2026-09-13",
	tags: ["image", "amiga", "acbm", "iff", "png", "retro", "graphics"],
	relatedTools: [
		"image/acbm-to-png",
		"image/iff-to-png",
		"image/art-to-png",
		"image/koa-to-png",
		"image/pcx-to-png",
	],
	bodyFormat: "mdx",
};
