import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-x11-xcur-cursors-to-png",
	title:
		"Converting X11 Xcursor to PNG: Multi-Resolution Mouse Pointer Extraction",
	description:
		"Unpack Linux and Unix X11 Xcursor (.xcur) pointer files. Learn how table-of-contents chunks, premultiplied ARGB pixels, and hotspot coordinates convert into transparent PNG images.",
	publishedAt: "2026-09-15",
	tags: ["image", "xcur", "cursor", "x11", "linux", "png"],
	relatedTools: [
		"image/xcur-to-png",
		"image/cur-to-png",
		"image/ani-to-png",
		"image/icns-to-png",
		"image/ico-to-png",
	],
	bodyFormat: "mdx",
};
