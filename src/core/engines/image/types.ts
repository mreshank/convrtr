import type { ParamValue } from "@/core/quality";

/**
 * Decodes one input image format into raw pixel data. Paired with an
 * `ImageEncoder` by `createImagePipelineEngine` to form a full conversion
 * engine, so a new input format costs exactly one decoder (not one engine
 * per possible output format) and a new output format costs exactly one
 * encoder (not one engine per possible input format).
 */
export interface ImageDecoder {
	/** Stable identifier, e.g. "png", "heic". Used as the registry key. */
	id: string;
	/** Input MIME types this decoder handles. */
	mime: string[];
	/** Whether this device/runtime can execute the decoder. */
	probe(): Promise<boolean>;
	decode(input: ArrayBuffer): Promise<ImageData>;
}

/**
 * Encodes raw pixel data into one output image format. See `ImageDecoder`
 * for why this is split out of a monolithic per-pair engine.
 */
export interface ImageEncoder {
	/** Stable identifier, e.g. "webp", "jpeg". Used as the registry key. */
	id: string;
	/** Output MIME type this encoder produces. */
	mime: string;
	/** Whether this device/runtime can execute the encoder. */
	probe(): Promise<boolean>;
	encode(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ArrayBuffer>;
}

/**
 * A step that operates on decoded pixels between decode and encode.
 *
 * Resize, crop and rotate are none of decode or encode — they act on the
 * `ImageData` in between. Folding them into an encoder would work once and
 * then need repeating for every output format, which is the multiplicative
 * trap the decoder/encoder split exists to avoid. Keeping them as a separate
 * stage means one resize implementation serves every decoder/encoder pair,
 * and chained operations (resize then compress then strip metadata) compose
 * without a bespoke engine per combination.
 */
export interface ImageTransform {
	/** Stable identifier, e.g. "resize". Appears in the composed engine id. */
	id: string;
	/** Whether this device/runtime can execute the transform. */
	probe(): Promise<boolean>;
	apply(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ImageData>;
}
