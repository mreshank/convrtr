import type { ImageDecoder } from "../types";

export const jxlDecoder: ImageDecoder = {
	id: "jxl",
	mime: ["image/jxl"],

	async probe() {
		return typeof WebAssembly === "object";
	},

	async decode(input: ArrayBuffer): Promise<ImageData> {
		// Dynamic import: the JPEG XL WASM codec is several hundred KB and
		// must only download when a conversion actually needs it.
		const { default: decode } = await import("@jsquash/jxl/decode");
		return decode(input);
	},
};
