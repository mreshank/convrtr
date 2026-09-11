import type { CollectiveMeta } from "../types";

export const meta: CollectiveMeta = {
	slug: "retro-computing",
	title: "Retro computing and vintage file recovery",
	why: "Digital preservation often runs into forgotten 8-bit and 16-bit binary formats from the 1980s and 1990s. Decode 1984 Apple Macintosh MacPaint graphics, Commodore Amiga Deluxe Paint IFF bitmaps and 8SVX audio samples, classic MS-DOS PCX images, and PlayStation 1 TIM textures into modern PNG and WAV assets entirely in memory.",
	toolIds: [
		"image/macpaint-to-png",
		"image/iff-to-png",
		"image/tim-to-png",
		"image/pcx-to-png",
		"audio/8svx-to-wav",
		"audio/mod-to-wav",
	],
};
