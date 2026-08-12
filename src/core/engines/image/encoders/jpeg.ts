import type { ParamValue } from "@/core/quality";
import type { ImageEncoder } from "../types";

function boolParam(
	params: Record<string, ParamValue>,
	key: string,
	fallback: boolean,
): boolean {
	const value = params[key];
	return typeof value === "boolean" ? value : fallback;
}

function numParam(
	params: Record<string, ParamValue>,
	key: string,
	fallback: number,
): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}

/**
 * mozjpeg's wasm binding exposes chroma subsampling as ONE scalar
 * (`chroma_subsample: number`) applied uniformly to both the horizontal and
 * vertical sampling factors of both chroma channels, with luma's factor
 * fixed at 2 (from `@jsquash/jpeg`'s default of `chroma_subsample: 2`
 * combined with `auto_subsample: true` producing no-subsampling output at
 * default quality — the only internally-consistent reading, since a chroma
 * factor can never exceed luma's without inverting what "subsampling" means).
 * That gives exactly two reachable ratios:
 *   - chroma_subsample 2 (chroma factor == luma factor) → 4:4:4
 *   - chroma_subsample 1 (chroma factor half of luma's)  → 4:2:0
 * 4:2:2 needs an asymmetric factor (half horizontally, full vertically) that
 * this single-number knob cannot express — there is no third value that
 * means "4:2:2" to fall back on, so it is intentionally not offered here
 * rather than silently rounded to one of the other two. This mapping is
 * derived from JPEG sampling-factor semantics and the library's own default
 * combination, not confirmed against mozjpeg's source (the wasm ships
 * without it) — worth a real spot-check against a hex dump of an encoded
 * SOF0 marker before shipping.
 */
function chromaSubsample(params: Record<string, ParamValue>): number {
	const value = params.chroma_subsample;
	if (value === "4:4:4") return 2;
	if (value === "4:2:0") return 1;
	if (value === "4:2:2") {
		throw new Error(
			"JPEG encoder: chroma_subsample '4:2:2' is not reachable through mozjpeg's wasm binding (single symmetric scalar, no asymmetric h/v control) — use '4:4:4' or '4:2:0'.",
		);
	}
	// Advanced/raw passthrough: the mozjpeg field is a plain number, so a
	// caller that already knows the wasm binding's own encoding can pass it
	// directly instead of one of the two labels above.
	if (typeof value === "number") return value;
	return 2;
}

export const jpegEncoder: ImageEncoder = {
	id: "jpeg",
	mime: "image/jpeg",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async encode(
		image: ImageData,
		params: Record<string, ParamValue>,
	): Promise<ArrayBuffer> {
		// Dynamic import: the JPEG (mozjpeg) WASM codec is several hundred KB
		// and must only download when a conversion actually needs it.
		const { default: encode } = await import("@jsquash/jpeg/encode");

		// `trellis` is the UI-facing convenience name from the brief; mozjpeg
		// itself has no single "trellis" field — it splits trellis
		// quantisation into three real options. Enabling the convenience
		// flag turns on all three, which together is what mozjpeg's own
		// `-trellis` CLI flag does.
		const trellis = boolParam(params, "trellis", false);

		return encode(image, {
			quality: numParam(params, "quality", 75),
			progressive: boolParam(params, "progressive", true),
			optimize_coding: boolParam(params, "optimize_coding", true),
			smoothing: numParam(params, "smoothing", 0),
			chroma_subsample: chromaSubsample(params),
			// Real mozjpeg default is `true`, which would silently ignore an
			// explicit `chroma_subsample` choice in favour of mozjpeg's own
			// quality-based heuristic. Defaulting to `false` here means the
			// subsampling control above actually takes effect unless a
			// caller opts back into the automatic behaviour.
			auto_subsample: boolParam(params, "auto_subsample", false),
			trellis_multipass: trellis,
			trellis_opt_zero: trellis,
			trellis_opt_table: trellis,
			trellis_loops: numParam(params, "trellis_loops", 1),
		});
	},
};
