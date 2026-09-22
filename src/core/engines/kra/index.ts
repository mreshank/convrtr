import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertKraToPng } from "./parser";

export * from "./parser";

/**
 * Krita (.kra) flattened-artwork preview extractor engine.
 * Unpacks the Krita ZIP container and returns the full-resolution
 * `mergedimage.png` composite (or `preview.png` fallback) bit-exact.
 */
export const kraToPngEngine: Engine = {
	id: "extract:kra-to-png",

	async probe() {
		return true; // Pure client-side ZIP parser & image extractor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertKraToPng(input, onProgress);
	},
};
