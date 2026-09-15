import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-better-portable-graphics-bpg-to-png",
	title:
		"Converting Better Portable Graphics (BPG) to PNG: HEVC-Derived Image Decoding",
	description:
		"Discover Fabrice Bellard's Better Portable Graphics (.bpg) format. Learn how HEVC intra-frame compression, LEB128 variable headers, and YCbCr color spaces convert to standard PNG.",
	publishedAt: "2026-09-15",
	tags: ["image", "bpg", "png", "hevc", "bellard", "graphics", "compression"],
	relatedTools: [
		"image/bpg-to-png",
		"image/qoi-to-png",
		"image/hdr-to-png",
		"image/png-to-webp",
		"image/dds-to-png",
	],
	bodyFormat: "mdx",
};
