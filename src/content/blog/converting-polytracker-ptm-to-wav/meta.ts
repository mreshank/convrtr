import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-polytracker-ptm-to-wav",
	title:
		"Converting PolyTracker (PTM) to WAV: 32-Channel DOS Game Chiptune Synthesis",
	description:
		"Explore Carlos Hasan's PolyTracker PTMF architecture. Learn how 32-channel panning tables, 16-bit PCM samples, ping-pong loops, and tracker synthesis render into CD-quality WAV in browser memory.",
	publishedAt: "2026-09-13",
	tags: ["audio", "chiptune", "ptm", "wav", "demoscene", "retro"],
	relatedTools: [
		"audio/ptm-to-wav",
		"audio/it-to-wav",
		"audio/s3m-to-wav",
		"audio/xm-to-wav",
	],
	bodyFormat: "mdx",
};
