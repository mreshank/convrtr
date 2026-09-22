import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDstToSvg } from "./parser";

export * from "./parser";

/**
 * Tajima DST machine-embroidery to SVG engine.
 * Decodes ternary stitch records into per-colour-block vector paths with
 * design statistics — a sew-shop proof that needs no digitising software.
 */
export const dstToSvgEngine: Engine = {
	id: "extract:dst-to-svg",

	async probe() {
		return true; // Pure client-side binary parser + SVG writer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDstToSvg(input, onProgress);
	},
};
