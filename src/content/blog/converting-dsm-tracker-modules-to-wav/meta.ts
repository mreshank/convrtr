import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-dsm-tracker-modules-to-wav",
	title:
		"Converting DSM Tracker Modules to WAV: RIFF DSMF Multi-Channel Audio Synthesis",
	description:
		"Explore DSIK's Dynamic Studio Module (DSM) tracker architecture. Learn how RIFF container chunks, 16-channel pattern matrices, and 8-bit PCM samples synthesize into 16-bit stereo WAV.",
	publishedAt: "2026-09-15",
	tags: ["audio", "dsm", "tracker", "wav", "demoscene", "retro"],
	relatedTools: [
		"audio/dsm-to-wav",
		"audio/amf-to-wav",
		"audio/s3m-to-wav",
		"audio/xm-to-wav",
		"audio/mod-to-wav",
	],
	bodyFormat: "mdx",
};
