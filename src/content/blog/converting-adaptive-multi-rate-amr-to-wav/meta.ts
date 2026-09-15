import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-adaptive-multi-rate-amr-to-wav",
	title:
		"Converting AMR to WAV: Decoding 3GPP Mobile Speech Audio in the Browser",
	description:
		"Learn how Adaptive Multi-Rate (AMR-NB and AMR-WB) speech codecs compress voice with ACELP and how convrtr synthesizes them into 16-bit linear PCM WAV without server uploads.",
	publishedAt: "2026-09-15",
	tags: ["audio", "amr", "wav", "telephony", "3gpp", "mobile", "voice"],
	relatedTools: [
		"audio/amr-to-wav",
		"audio/silk-to-wav",
		"audio/ulaw-to-wav",
		"audio/vox-to-wav",
	],
	bodyFormat: "mdx",
};
