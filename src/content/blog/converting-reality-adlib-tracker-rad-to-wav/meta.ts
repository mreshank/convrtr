import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "converting-reality-adlib-tracker-rad-to-wav",
	title:
		"Converting Reality Adlib Tracker (RAD) to WAV: 9-Channel OPL2 FM Synthesis",
	description:
		"Explore the internal architecture of Reality Adlib Tracker (.rad) files. Learn how Yamaha YM3812 2-operator FM synth parameters synthesize into 16-bit stereo WAV in your browser.",
	publishedAt: "2026-09-15",
	tags: ["audio", "rad", "adlib", "opl2", "chiptune", "wav", "tracker"],
	relatedTools: [
		"audio/rad-to-wav",
		"audio/mod-to-wav",
		"audio/s3m-to-wav",
		"audio/xm-to-wav",
		"audio/amf-to-wav",
	],
	bodyFormat: "mdx",
};
