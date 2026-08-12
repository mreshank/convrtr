import type { ImageDecoder } from "../types";

export const avifDecoder: ImageDecoder = {
	id: "avif",
	mime: ["image/avif"],

	async probe() {
		return typeof WebAssembly === "object";
	},

	async decode(input: ArrayBuffer): Promise<ImageData> {
		// Dynamic import: the AVIF WASM codec is several hundred KB and must
		// only download when a conversion actually needs it.
		const { default: decode } = await import("@jsquash/avif/decode");
		// The no-options overload returns `ImageData | null` (null on a
		// corrupt/unsupported bitstream); the 10/12-bit overloads are opt-in
		// via an explicit `bitDepth` option we never pass, so this call is
		// always the 8-bit path.
		const image = await decode(input);
		if (!image) {
			throw new Error("AVIF decode failed: corrupt or unsupported input");
		}
		return image;
	},
};
