import type { ParamValue } from "@/core/quality";
import type { ImageTransform } from "../types";

/**
 * Resamples with `@jsquash/resize` rather than drawing to a canvas.
 *
 * Canvas downscaling uses bilinear filtering, which is why photos shrunk by
 * most browser-based tools look soft. Lanczos3 is the default here for the
 * same reason desktop image editors default to something in that family: it
 * preserves detail at the cost of a little ringing, and the difference is
 * plainly visible at typical photo downscale ratios.
 *
 * `fitMethod: "contain"` preserves aspect ratio by default — a resize that
 * silently distorts a photo is a worse failure than one that leaves it
 * slightly smaller than asked for.
 */
export const resizeTransform: ImageTransform = {
	id: "resize",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async apply(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ImageData> {
		const targetWidth = Number(params.width ?? 0);
		const targetHeight = Number(params.height ?? 0);

		// Nothing to do — return the input untouched rather than paying for a
		// resample that cannot change anything.
		if (
			(!targetWidth && !targetHeight) ||
			(targetWidth === image.width && targetHeight === image.height)
		) {
			return image;
		}

		// One dimension given: derive the other from the source aspect ratio, so
		// "make this 1200px wide" does the obvious thing.
		const width =
			targetWidth || Math.round((targetHeight / image.height) * image.width);
		const height =
			targetHeight || Math.round((targetWidth / image.width) * image.height);

		if (width < 1 || height < 1) {
			throw new Error(
				`resize: computed a non-positive target (${width}x${height}) from width=${targetWidth} height=${targetHeight}`,
			);
		}

		// Dynamic import: the resampler is WASM and must only download when a
		// resize is actually requested.
		const { default: resize } = await import("@jsquash/resize");

		return resize(image, {
			width,
			height,
			method: String(params.method ?? "lanczos3") as never,
			fitMethod: String(params.fitMethod ?? "contain") as never,
			premultiply: params.premultiply !== false,
			linearRGB: params.linearRGB !== false,
		});
	},
};
