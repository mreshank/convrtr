import type { ParamValue } from "@/core/quality";
import type { ImageEncoder } from "../types";

export const webpEncoder: ImageEncoder = {
	id: "webp",
	mime: "image/webp",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async encode(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ArrayBuffer> {
		// Dynamic import: the WebP WASM codec is several hundred KB and must
		// only download when a conversion actually needs it.
		const { default: encode } = await import("@jsquash/webp/encode");
		return encode(image, {
			lossless: Number(params.lossless ?? 0),
			quality: Number(params.quality ?? 92),
			method: Number(params.method ?? 4),
			near_lossless: Number(params.near_lossless ?? 100),
			alpha_quality: Number(params.alpha_quality ?? 100),
			filter_strength: Number(params.filter_strength ?? 60),
			segments: Number(params.segments ?? 4),
			sns_strength: Number(params.sns_strength ?? 50),
		});
	},
};
