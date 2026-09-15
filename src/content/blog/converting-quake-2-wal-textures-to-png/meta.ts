import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-quake-2-wal-textures-to-png",
	title:
		"Converting Quake II WAL Textures to PNG: id Tech 2 Mipmapped Raster Decoding",
	description:
		"Explore id Software's Quake II WAL texture format. Learn how 100-byte headers, 4-level precomputed mipmaps, and 256-color colormaps convert into 32-bit RGBA PNG graphics.",
	publishedAt: "2026-09-15",
	tags: ["image", "wal", "png", "quake", "gamedev", "retro", "textures"],
	relatedTools: [
		"image/wal-to-png",
		"image/pcx-to-png",
		"image/tga-to-png",
		"image/blp-to-png",
		"image/vtf-to-png",
	],
	bodyFormat: "mdx",
};
