import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-scream-tracker-s3m-to-wav",
	title:
		"Converting Scream Tracker 3 S3M Modules to WAV: Architecture and Synthesis",
	description:
		"Examine Future Crew's Scream Tracker 3 (.s3m) format. Learn how 32-channel bit-packed note patterns, 16-bit paragraph sample offsets, and Gus/OPL panning are synthesized into 16-bit linear PCM WAV.",
	publishedAt: "2026-09-12",
	tags: ["audio", "retro", "chiptune", "demoscene", "screamtracker", "gaming"],
	relatedTools: ["audio/s3m-to-wav", "audio/xm-to-wav", "audio/mod-to-wav"],
	bodyFormat: "mdx",
};
