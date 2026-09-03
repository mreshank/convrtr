import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "how-mlw-encryption-works",
	title: "How MLW Video Encryption Actually Works",
	description:
		"A byte-level walkthrough of the MLW container format: the Root marker, the filename block, the AES-GCM payload, and the one part of the layout nobody has documented.",
	publishedAt: "2026-08-27",
	relatedTools: ["video/mlw-to-mp4"],
	tags: ["mlw", "video", "reverse-engineering", "aes-gcm"],
	bodyFormat: "mdx",
};
