import type { ParamValue } from "@/core/quality";
import type { ImageEncoder } from "../types";

export const avifEncoder: ImageEncoder = {
	id: "avif",
	mime: "image/avif",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async encode(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ArrayBuffer> {
		// Dynamic import: the AVIF WASM codec is several hundred KB and must
		// only download when a conversion actually needs it.
		const { default: encode } = await import("@jsquash/avif/encode");

		const qualityValue = params.quality;
		const speedValue = params.speed;
		const subsampleValue = params.subsample;
		const losslessValue = params.lossless;

		return encode(image, {
			quality: typeof qualityValue === "number" ? qualityValue : 50,
			speed: typeof speedValue === "number" ? speedValue : 6,
			// 1 = 4:2:0, 3 = 4:4:4 — jSquash's own `EncodeOptions.subsample`
			// values, passed through as-is rather than relabelled.
			subsample: typeof subsampleValue === "number" ? subsampleValue : 1,
			// jSquash forces quality=100/qualityAlpha=-1/subsample=3 (4:4:4)
			// whenever `lossless` is true, warning if the caller's own
			// quality/subsample disagree — see `@jsquash/avif/encode`'s
			// source. AVIF "lossless" is still a real lossy transform for
			// most inputs in practice (AVIF's lossless mode is exact only for
			// certain internal colour transforms); it is genuinely reversible
			// pixel-for-pixel for standard 8-bit RGBA, which is what this
			// pipeline always hands it.
			lossless: typeof losslessValue === "boolean" ? losslessValue : false,
		});
	},
};
