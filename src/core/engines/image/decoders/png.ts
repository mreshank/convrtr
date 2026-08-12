import type { ImageDecoder } from "../types";

export const pngDecoder: ImageDecoder = {
	id: "png",
	mime: ["image/png"],

	async probe() {
		return typeof WebAssembly === "object";
	},

	async decode(input: ArrayBuffer): Promise<ImageData> {
		// Dynamic import: the PNG WASM codec is several hundred KB and must
		// only download when a conversion actually needs it.
		const { default: decode } = await import("@jsquash/png/decode");
		return decode(input);
	},
};
