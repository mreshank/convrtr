import type { Tool } from "../../types";

type QualityProfile = Tool["quality"];

/**
 * One quality profile per *encoder*, not per source/target pair.
 *
 * Presets and advanced controls are a property of what the encoder actually
 * accepts (see `src/core/engines/image/encoders/*.ts`), not of which decoder
 * feeds it — heic->jpeg and png->jpeg both land on mozjpeg, so they share
 * this table instead of two near-identical copies drifting apart the moment
 * one of them is hand-edited.
 *
 * Every `losslessAvailable` value below, and the reasoning behind it, is
 * written up in
 * `.superpowers/sdd/2026-08-07-spine-vertical-slice/w2-tools-report.md`.
 */
export const IMAGE_QUALITY_PROFILES = {
	// mozjpeg (`@jsquash/jpeg`) has no lossless mode at all — every path
	// through `encoders/jpeg.ts` runs a real DCT + quantisation pass keyed
	// on `quality`. There is no parameter combination that skips it.
	jpeg: {
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "visually-lossless",
				label: "Visually lossless",
				explanation:
					"No visible difference at normal viewing sizes, with full-resolution colour (4:4:4). Still a lossy JPEG underneath.",
				params: {
					quality: 92,
					progressive: true,
					chroma_subsample: "4:4:4",
					trellis: true,
					optimize_coding: true,
					smoothing: 0,
				},
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"The standard photographic trade-off. Chroma is halved (4:2:0), which is what most cameras already do.",
				params: {
					quality: 78,
					progressive: true,
					chroma_subsample: "4:2:0",
					trellis: true,
					optimize_coding: true,
					smoothing: 0,
				},
			},
			{
				id: "smallest",
				label: "Smallest",
				explanation:
					"Aggressive. Blocking and colour banding become visible, especially around text and sharp edges.",
				params: {
					quality: 55,
					progressive: true,
					chroma_subsample: "4:2:0",
					trellis: true,
					optimize_coding: true,
					smoothing: 10,
				},
			},
		],
		advanced: [
			{
				control: "slider",
				key: "quality",
				label: "Quality",
				group: "Encoder",
				min: 1,
				max: 100,
				step: 1,
				default: 78,
			},
			{
				control: "toggle",
				key: "progressive",
				label: "Progressive",
				group: "Encoder",
				default: true,
			},
			{
				control: "select",
				key: "chroma_subsample",
				label: "Chroma subsampling",
				group: "Encoder",
				// Only the two ratios mozjpeg's wasm binding can actually reach
				// (see the `chromaSubsample()` comment in `encoders/jpeg.ts`).
				// "4:2:2" is deliberately absent: the encoder throws on it.
				options: [
					{ value: "4:4:4", label: "4:4:4 — full colour resolution" },
					{ value: "4:2:0", label: "4:2:0 — standard, halves chroma" },
				],
				default: "4:2:0",
			},
			{
				control: "toggle",
				key: "trellis",
				label: "Trellis quantisation",
				group: "Encoder",
				default: true,
			},
			{
				control: "toggle",
				key: "optimize_coding",
				label: "Optimise Huffman tables",
				group: "Encoder",
				default: true,
			},
			{
				control: "slider",
				key: "smoothing",
				label: "Smoothing",
				group: "Image",
				min: 0,
				max: 100,
				step: 1,
				default: 0,
			},
		],
	},

	// PNG's DEFLATE stream is lossless by construction and `@jsquash/png` has
	// no lossy path. oxipng's `optimise` step in `encoders/png.ts` only
	// recompresses the already-encoded bytes at a higher search effort — it
	// is fed the encoded `ArrayBuffer`, not raw pixels, so it never touches a
	// decoded pixel value.
	png: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Bit-exact. oxipng repacks the same pixels into a smaller file without changing a single value.",
				params: { optimise: true, optimiseLevel: 2 },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "optimise",
				label: "Optimise (oxipng)",
				group: "Encoder",
				default: true,
			},
			{
				control: "stepper",
				key: "optimiseLevel",
				label: "Optimisation level",
				group: "Encoder",
				min: 0,
				max: 6,
				step: 1,
				default: 2,
			},
		],
	},

	// WebP genuinely supports both modes — `encoders/webp.ts` forwards
	// `lossless` straight through to `@jsquash/webp`. This table is the
	// original `png-to-webp` tool's quality block, unchanged: its exact
	// preset labels, numbers, and explanation strings are asserted on by
	// `src/components/instrument/__tests__/OptionsPanel.test.tsx` and
	// `src/core/quality/__tests__/quality.test.ts`.
	webp: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation: "Bit-exact. The original pixels are recoverable.",
				params: { lossless: 1, quality: 100, method: 4 },
			},
			{
				id: "visually-lossless",
				label: "Visually lossless",
				explanation:
					"No difference you can see at 100% zoom. Noticeably smaller.",
				params: { lossless: 0, quality: 92, method: 4 },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation: "Clearly smaller. Loss is hard to spot in normal use.",
				params: { lossless: 0, quality: 78, method: 4 },
			},
			{
				id: "smallest",
				label: "Smallest",
				explanation: "Aggressive. Visible artefacts on detailed images.",
				params: { lossless: 0, quality: 55, method: 6 },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "method",
				label: "Method",
				group: "Encoder",
				min: 0,
				max: 6,
				step: 1,
				default: 4,
			},
			{
				control: "slider",
				key: "near_lossless",
				label: "Near lossless",
				group: "Encoder",
				min: 0,
				max: 100,
				step: 1,
				default: 100,
			},
			{
				control: "slider",
				key: "alpha_quality",
				label: "Alpha quality",
				group: "Encoder",
				min: 0,
				max: 100,
				step: 1,
				default: 100,
			},
			{
				control: "stepper",
				key: "filter_strength",
				label: "Filter strength",
				group: "Encoder",
				min: 0,
				max: 100,
				step: 1,
				default: 60,
			},
			{
				control: "stepper",
				key: "segments",
				label: "Segments",
				group: "Output",
				min: 1,
				max: 4,
				step: 1,
				default: 4,
			},
			{
				control: "stepper",
				key: "sns_strength",
				label: "SNS strength",
				group: "Output",
				min: 0,
				max: 100,
				step: 1,
				default: 50,
			},
			{
				control: "toggle",
				key: "exif",
				label: "Keep EXIF orientation",
				group: "Image",
				default: true,
			},
		],
	},

	// `@jsquash/avif` does accept `lossless: true` (see `encoders/avif.ts`)
	// and it is genuinely reversible for the 8-bit RGBA this pipeline always
	// hands it — but AVIF lossless mode is an all-intra, still-image path
	// that typically produces files *larger* than a well-tuned lossy AVIF or
	// even the source, and is inconsistently decoded outside browsers. It is
	// impractical, so it is not offered: no preset sets `lossless`, and
	// there is no advanced toggle for it, so `losslessAvailable: false`
	// matches what this tool actually exposes.
	avif: {
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "visually-lossless",
				label: "Visually lossless",
				explanation:
					"Very high fidelity — differences only show up pixel-peeping at 100% zoom. Slower to encode than the other presets.",
				params: { quality: 85, speed: 4, subsample: 3 },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"AVIF's usual sweet spot: smaller than an equivalent-quality JPEG or WebP with only mild softening.",
				params: { quality: 50, speed: 6, subsample: 1 },
			},
			{
				id: "smallest",
				label: "Smallest",
				explanation:
					"Heavy compression. Fine detail smears and blocking appears in busy areas.",
				params: { quality: 28, speed: 8, subsample: 1 },
			},
		],
		advanced: [
			{
				control: "slider",
				key: "quality",
				label: "Quality",
				group: "Encoder",
				min: 0,
				max: 100,
				step: 1,
				default: 50,
			},
			{
				control: "stepper",
				key: "speed",
				label: "Encoding speed",
				group: "Encoder",
				min: 0,
				max: 10,
				step: 1,
				default: 6,
			},
			{
				control: "stepper",
				key: "subsample",
				label: "Chroma subsampling (1 = 4:2:0, 3 = 4:4:4)",
				group: "Encoder",
				// `encoders/avif.ts` reads this as a raw number — jSquash's own
				// encoding, not a relabelled string — so this is a stepper over
				// the two real values rather than a `select`. A `select`'s value
				// is always a string; the encoder's `typeof === "number"` check
				// would silently fail it and fall back to the default every
				// time, making the control a no-op.
				min: 1,
				max: 3,
				step: 2,
				default: 1,
			},
		],
	},

	// `@jsquash/jxl` 1.3.0 does forward a `lossless: boolean` field all the
	// way to the compiled wasm module (`encode.js` special-cases it and
	// passes it into `module.encode(...)`), so it is not a dead field — but
	// forwarding a flag is not the same as it working. Encoding synthetic
	// RGBA fixtures with `lossless: true` and decoding them back (verified
	// directly against this package's own `encode.js`/`decode.js`, not just
	// its `.d.ts` types) shows the output is NOT bit-exact for any image with
	// real content: flat single-colour fills round-trip exactly, but
	// gradients and noise come back with roughly 0.1-0.3% of bytes off by 1.
	// There is also no raw `distance` field and no lossless-JPEG-
	// recompression entry point — `encode()` only accepts decoded `ImageData`,
	// never raw JPEG bytes (see `encoders/jxl.ts`). Declaring a "lossless"
	// preset or `losslessAvailable: true` here would promise a guarantee
	// this build cannot keep, so every preset is honestly lossy and the
	// `lossless` field is never set from this tool.
	jxl: {
		losslessAvailable: false,
		defaultPreset: "balanced",
		presets: [
			{
				id: "visually-lossless",
				label: "Visually lossless",
				explanation:
					"High fidelity — differences only show up pixel-peeping. JPEG XL isn't supported everywhere yet; check your target software first.",
				params: { quality: 90, effort: 7, progressive: false },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"JPEG XL's default trade-off: typically smaller than an equivalent-quality JPEG with fewer blocking artefacts.",
				params: { quality: 75, effort: 7, progressive: false },
			},
			{
				id: "smallest",
				label: "Smallest",
				explanation:
					"Aggressive compression, with encoder effort raised to spend more time squeezing out extra savings.",
				params: { quality: 45, effort: 9, progressive: false },
			},
		],
		advanced: [
			{
				control: "slider",
				key: "quality",
				label: "Quality",
				group: "Encoder",
				min: 1,
				max: 100,
				step: 1,
				default: 75,
			},
			{
				control: "stepper",
				key: "effort",
				label: "Effort (higher = slower, smaller)",
				group: "Encoder",
				min: 1,
				max: 9,
				step: 1,
				default: 7,
			},
			{
				control: "toggle",
				key: "progressive",
				label: "Progressive rendering",
				group: "Encoder",
				default: false,
			},
		],
	},
} satisfies Record<"jpeg" | "png" | "webp" | "avif" | "jxl", QualityProfile>;
