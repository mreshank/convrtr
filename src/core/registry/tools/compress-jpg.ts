import type { Tool } from "../types";

/**
 * Target-size compression.
 *
 * The `targetBytes` control is what makes this different from the ordinary
 * quality slider on every conversion tool: instead of guessing a quality and
 * checking the result, the encoder is binary-searched for the highest quality
 * that still fits. See `src/core/engines/image/target-size.ts`.
 */
export const compressJpg: Tool = {
	id: "image/compress-jpg",
	slug: "compress-jpg",
	category: "image",
	kind: "compress",
	accept: { mime: ["image/jpeg", "image/jpg"], ext: ["jpg", "jpeg"] },
	output: { ext: "jpg", mime: "image/jpeg" },
	engines: ["image:jpeg->jpeg"],
	quality: {
		losslessAvailable: false,
		defaultPreset: "target-size",
		presets: [
			{
				id: "target-size",
				label: "Target size",
				explanation:
					"Name a size and the encoder is searched for the best quality that fits under it.",
				params: { targetBytes: 2_000_000 },
			},
			{
				id: "visually-lossless",
				label: "Visually lossless",
				explanation:
					"No difference you can see at 100% zoom. Size is whatever it turns out to be.",
				params: { targetBytes: 0, quality: 92 },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation: "Clearly smaller. Loss is hard to spot in normal use.",
				params: { targetBytes: 0, quality: 78 },
			},
			{
				id: "smallest",
				label: "Smallest",
				explanation: "Aggressive. Visible artefacts on detailed images.",
				params: { targetBytes: 0, quality: 55 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "targetBytes",
				label: "Target size (bytes)",
				group: "Target",
				min: 0,
				max: 50_000_000,
				step: 100_000,
				default: 2_000_000,
			},
			{
				control: "slider",
				key: "quality",
				label: "Quality (ignored when a target is set)",
				group: "Encoder",
				min: 1,
				max: 100,
				step: 1,
				default: 92,
			},
			{
				control: "select",
				key: "chroma_subsample",
				label: "Chroma subsampling",
				group: "Encoder",
				options: [
					{ value: "3", label: "4:4:4 (no subsampling)" },
					{ value: "2", label: "4:2:2" },
					{ value: "1", label: "4:2:0 (smallest)" },
				],
				default: "3",
			},
			{
				control: "toggle",
				key: "progressive",
				label: "Progressive",
				group: "Encoder",
				default: true,
			},
		],
	},
	seo: {
		title: "Compress a JPG to a target file size | convrtr",
		h1: "Compress a JPG",
		intent:
			"Shrink a JPG to fit a size limit — an email attachment cap, an upload form, a forum's 2 MB rule. Rather than making you guess a quality percentage and check the result, this searches the encoder for the highest quality that still fits under the size you name. It runs entirely in your browser; the photo is never uploaded.",
		faq: [
			{
				q: "How does targeting a size actually work?",
				a: "Image encoders are nowhere near linear in quality-to-size, so guessing is unreliable. The encoder is binary-searched instead: seven encodes resolve the full 1-100 quality range and settle on the highest quality whose output fits your target.",
			},
			{
				q: "What if my target is impossible?",
				a: "You get the smallest file the encoder can produce, and the tool says the target was not met rather than handing back an oversized file as though it had worked. A photo that misses an upload limit by a few kilobytes is useless, so the search always errs on the side of being under.",
			},
			{
				q: "Can I compress without losing quality?",
				a: "Not with JPEG — it has no lossless mode, so any re-encode re-quantises the image. If you want a genuinely lossless result, convert to PNG or WebP lossless instead, though the file will usually be larger.",
			},
			{
				q: "Will this strip my photo's location data?",
				a: "Yes, as a side effect: compressing decodes and re-encodes the image, and metadata does not survive that. If you want the metadata gone without re-compressing, use the remove-EXIF tool instead.",
			},
		],
		related: ["image/remove-exif-jpg", "image/resize-jpg", "image/jpg-to-webp"],
	},
};
