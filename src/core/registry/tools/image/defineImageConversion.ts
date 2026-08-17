import type { Tool } from "../../types";
import { IMAGE_QUALITY_PROFILES } from "./quality-profiles";

export type ImageDecoderId = "png" | "jpeg" | "avif" | "jxl" | "webp" | "heic";
export type ImageEncoderId = "webp" | "jpeg" | "png" | "avif" | "jxl";

/**
 * MIME types per format, declared here rather than read from
 * `@/core/engines/image/registry`.
 *
 * The registry layer is pure data and must not import an engine (spec §5.1).
 * Importing the engine registry pulled all nine codec modules — and their
 * dynamic WASM imports — into the build graph of every statically generated
 * tool page, which hung `next build` at compilation.
 *
 * The obvious cost of duplicating these is drift, so it is covered:
 * `__tests__/mime-parity.test.ts` imports both sides and fails if they ever
 * disagree. Tests are not part of the app bundle, so they can hold the
 * dependency the runtime cannot.
 */
const INPUT_MIME: Record<ImageDecoderId, string[]> = {
	heic: ["image/heic", "image/heif"],
	jpeg: ["image/jpeg", "image/jpg"],
	png: ["image/png"],
	webp: ["image/webp"],
	avif: ["image/avif"],
	jxl: ["image/jxl"],
};

const OUTPUT_MIME: Record<ImageEncoderId, string> = {
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	avif: "image/avif",
	jxl: "image/jxl",
};

/**
 * The user-facing file extension for each format, independent of its
 * decoder/encoder id or MIME type.
 *
 * Only jpeg differs from its id: people search and save "jpg", not "jpeg",
 * so this is what slugs and output filenames are built from. The MIME type,
 * decoder/encoder id, and engine id all stay "jpeg" everywhere else —
 * matching `@jsquash/jpeg`'s own `image/jpeg` MIME type and this repo's
 * `jpeg` decoder/encoder ids — so only the file-extension-facing surface
 * changes, never the internal wiring.
 */
const IMAGE_EXT: Record<ImageDecoderId | ImageEncoderId, string> = {
	heic: "heic",
	jpeg: "jpg",
	png: "png",
	webp: "webp",
	avif: "avif",
	jxl: "jxl",
};

export interface ImageConversionSeo {
	title: string;
	h1: string;
	intent: string;
	faq: { q: string; a: string }[];
	related: string[];
}

export interface DefineImageConversionInput {
	from: {
		/** Decoder id in `IMAGE_DECODERS` — also the left half of the engine id. */
		decoder: ImageDecoderId;
		/**
		 * Extra accepted file extensions beyond the canonical one in
		 * `IMAGE_EXT`, e.g. jpeg source files also arrive as ".jpeg".
		 */
		extraExt?: string[];
	};
	/**
	 * Target format — an encoder id in `IMAGE_ENCODERS`. Its quality profile
	 * comes from `IMAGE_QUALITY_PROFILES`, not from this call site: presets
	 * and advanced params are a property of the encoder, not of this pair.
	 */
	to: ImageEncoderId;
	/** Genuinely per-tool SEO copy. Nothing here is templated or derived. */
	seo: ImageConversionSeo;
	/** Escape hatch for a pair whose slug shouldn't follow `<from>-to-<to>`. */
	slug?: string;
}

/**
 * Builds one image conversion `Tool` from a decoder id, a target encoder
 * id, and hand-written SEO copy — the one code path every `image/*`
 * conversion tool (including the migrated `png-to-webp`) goes through, so
 * that adding a new pair costs one small config object instead of ~100
 * lines of near-duplicate schema.
 */
export function defineImageConversion(input: DefineImageConversionInput): Tool {
	const canonicalExt = IMAGE_EXT[input.from.decoder];
	const outputExt = IMAGE_EXT[input.to];
	const slug = input.slug ?? `${canonicalExt}-to-${outputExt}`;

	return {
		id: `image/${slug}`,
		slug,
		category: "image",
		kind: "convert",
		accept: {
			mime: INPUT_MIME[input.from.decoder],
			ext: [canonicalExt, ...(input.from.extraExt ?? [])],
		},
		output: { ext: outputExt, mime: OUTPUT_MIME[input.to] },
		engines: [`image:${input.from.decoder}->${input.to}`],
		quality: IMAGE_QUALITY_PROFILES[input.to],
		seo: input.seo,
	};
}
