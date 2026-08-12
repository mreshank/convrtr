import type { ParamValue } from "@/core/quality";
import type { ImageEncoder } from "../types";

export const pngEncoder: ImageEncoder = {
	id: "png",
	mime: "image/png",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async encode(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ArrayBuffer> {
		// Dynamic import: the PNG WASM codec is several hundred KB and must
		// only download when a conversion actually needs it.
		const { default: encode } = await import("@jsquash/png/encode");
		const encoded = await encode(image);

		const optimiseValue = params.optimise;
		const shouldOptimise =
			typeof optimiseValue === "boolean" ? optimiseValue : true;
		if (!shouldOptimise) return encoded;

		const levelValue = params.optimiseLevel;
		const level = typeof levelValue === "number" ? levelValue : 2;

		// oxipng's `optimise` is LOSSLESS recompression, not re-encoding: fed
		// an already-encoded PNG `ArrayBuffer` (as opposed to its other
		// accepted input, raw `ImageData`, which would make it re-encode from
		// pixels), it only re-runs zlib/deflate search at a higher effort
		// level and rewrites chunk layout — it never touches a decoded pixel
		// value. Passing the encoded `ArrayBuffer` here, not `image`, is what
		// keeps this bit-identical in decoded pixels; verified in
		// `__tests__/png-encoder.test.ts` by decoding both the unoptimised
		// and optimised output and comparing every subpixel.
		const { default: optimise } = await import("@jsquash/oxipng/optimise");
		return optimise(encoded, {
			level,
			interlace: false,
			optimiseAlpha: false,
		});
	},
};
