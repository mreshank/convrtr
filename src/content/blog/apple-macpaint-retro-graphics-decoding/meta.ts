import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "apple-macpaint-retro-graphics-decoding",
	title:
		"Decoding 1984 Apple MacPaint Bitmaps: Byte-Run Compression to Modern PNG",
	description:
		"The byte architecture of Bill Atkinson's classic 1984 Macintosh MacPaint format, PackBits byte-run RLE decoding, and restoring vintage 576x720 1-bit art into pristine PNGs.",
	publishedAt: "2026-09-06",
	relatedTools: ["image/macpaint-to-png"],
	tags: [
		"macpaint",
		"apple",
		"retrocomputing",
		"packbits",
		"pixel-art",
		"vintage",
	],
	bodyFormat: "mdx",
};
