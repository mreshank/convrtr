export type Sample = {
	id: string;
	/** Path under `/public`, fetched same-origin only on demo activation. */
	source: string;
	/**
	 * The file's real on-disk byte size. Hardcoded rather than read from disk
	 * at import time — this module is imported by a client component
	 * (`LiveDemo`), so it cannot reach for `node:fs` — and checked against
	 * the actual file by `__tests__/registry.test.ts`. A manifest whose sizes
	 * drift from the files is worse than no manifest: the demo would report a
	 * number it did not measure. Regenerate with `node
	 * scripts/generate-samples.mjs` and update this field together if either
	 * sample ever changes.
	 */
	bytes: number;
	mime: string;
	/** Shown in the demo UI, e.g. "podcast-clip.wav". */
	label: string;
};

/**
 * The two samples `scripts/generate-samples.mjs` writes into
 * `public/samples/`, each real and independently decodable — a WAV of
 * synthesised PCM, a PNG of raw pixel data — because those are the only two
 * formats this product can honestly generate rather than fetch from
 * somewhere. Every `LiveDemo` on the site currently points at one of these
 * two; a demo for any other input format would need a new, equally honest
 * generator before it could exist.
 */
export const SAMPLES: Sample[] = [
	{
		id: "podcast-clip-wav",
		source: "/samples/podcast-clip.wav",
		bytes: 44144,
		mime: "audio/wav",
		label: "podcast-clip.wav",
	},
	{
		id: "tagged-photo-png",
		source: "/samples/tagged-photo.png",
		bytes: 76436,
		mime: "image/png",
		label: "tagged-photo.png",
	},
];

export function getSample(id: string): Sample | undefined {
	return SAMPLES.find((sample) => sample.id === id);
}
