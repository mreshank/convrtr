import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSketchToPng } from "./parser";

export * from "./parser";

/**
 * Sketch (.sketch) page-preview extractor engine.
 * Unpacks the Sketch ZIP container and returns the rendered
 * `previews/preview.png` page composite bit-exact.
 */
export const sketchToPngEngine: Engine = {
	id: "extract:sketch-to-png",

	async probe() {
		return true; // Pure client-side ZIP parser & image extractor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertSketchToPng(input, onProgress);
	},
};
