import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-openraster-ora-to-png",
	title:
		"Converting OpenRaster ORA to PNG: Architecture of Layered Open Graphics",
	description:
		"Dive into the OpenRaster (.ora) specification. Learn how PKZIP container structures, stack.xml layer manifests, and composite blend operations are extracted into clean 32-bit RGBA PNGs.",
	publishedAt: "2026-09-13",
	tags: ["image", "openraster", "png", "krita", "mypaint", "design"],
	relatedTools: [
		"image/ora-to-png",
		"image/clip-to-png",
		"image/procreate-to-png",
		"image/aseprite-to-png",
	],
	bodyFormat: "mdx",
};
