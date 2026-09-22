import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertExpToSvg } from "./parser";

export * from "./parser";

/**
 * Melco EXP machine-embroidery to SVG engine.
 * Decodes headerless 2's-complement stitch moves (with jump/stop control
 * codes) into per-colour-block vector paths via the shared stitch renderer.
 */
export const expToSvgEngine: Engine = {
	id: "extract:exp-to-svg",

	async probe() {
		return true; // Pure client-side binary parser + SVG writer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertExpToSvg(input, onProgress);
	},
};
