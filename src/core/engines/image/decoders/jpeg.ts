import type { ImageDecoder } from "../types";

export const jpegDecoder: ImageDecoder = {
	id: "jpeg",
	mime: ["image/jpeg", "image/jpg"],

	async probe() {
		return typeof WebAssembly === "object";
	},

	async decode(input: ArrayBuffer): Promise<ImageData> {
		// Dynamic import: the JPEG (mozjpeg) WASM codec is several hundred KB
		// and must only download when a conversion actually needs it.
		const { default: decode } = await import("@jsquash/jpeg/decode");
		return decode(input);
	},
};
