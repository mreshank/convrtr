import type { ParamValue } from "@/core/quality";
import type { ImageEncoder } from "../types";

export const jxlEncoder: ImageEncoder = {
	id: "jxl",
	mime: "image/jxl",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async encode(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ArrayBuffer> {
		// Dynamic import: the JPEG XL WASM codec is several hundred KB and
		// must only download when a conversion actually needs it.
		const { default: encode } = await import("@jsquash/jxl/encode");

		// `@jsquash/jxl` 1.3.0's `EncodeOptions` has no raw `distance`
		// field — only `quality` (0-100) and `lossless` (boolean). In
		// libjxl's own terms, `distance: 0` means "mathematically lossless",
		// which is exactly what `lossless: true` requests here, so
		// `distance === 0` is accepted as an alias for it. No other distance
		// value has a passthrough in this binding: jSquash does its own
		// quality→distance conversion inside the wasm module and never
		// exposes the intermediate value, so we do not invent a formula to
		// fake one — `quality` is the only lossy control actually forwarded
		// to libjxl.
		const distanceValue = params.distance;
		const losslessParam = params.lossless;
		const lossless =
			distanceValue === 0 ||
			(typeof losslessParam === "boolean" && losslessParam);

		const qualityValue = params.quality;
		const effortValue = params.effort;

		// Note on lossless JPEG recompression: libjxl can transcode an
		// existing JPEG's DCT coefficients directly into a JXL container
		// (~20% smaller, fully reversible back to the exact original JPEG
		// bytes) without a decode/re-encode round trip. That path needs an
		// entry point that accepts raw JPEG bytes; `@jsquash/jxl/encode`'s
		// only export is `encode(data: ImageData, options)` — pixels in, no
		// JPEG-bytes overload anywhere in `decode.d.ts`/`encode.d.ts`/
		// `codec/enc/jxl_enc.d.ts`. This package does not expose that path,
		// so it is not reachable here, and this encoder does not claim to
		// support it.
		return encode(image, {
			lossless,
			quality: typeof qualityValue === "number" ? qualityValue : 75,
			effort: typeof effortValue === "number" ? effortValue : 7,
		});
	},
};
