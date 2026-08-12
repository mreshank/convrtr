import type { ImageDecoder } from "../types";

export const webpDecoder: ImageDecoder = {
	id: "webp",
	mime: ["image/webp"],

	async probe() {
		return typeof WebAssembly === "object";
	},

	async decode(input: ArrayBuffer): Promise<ImageData> {
		// Dynamic import: the WebP WASM codec is several hundred KB and must
		// only download when a conversion actually needs it.
		const { default: decode } = await import("@jsquash/webp/decode");
		return decode(input);
	},
};
