import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertJefToSvg } from "./parser";

export * from "./parser";

/**
 * Janome JEF machine-embroidery to SVG engine.
 * Reads the header offset + colour count, decodes signed-delta stitches and
 * 4-byte control commands, and renders per-thread vector blocks via the
 * shared stitch renderer.
 */
export const jefToSvgEngine: Engine = {
	id: "extract:jef-to-svg",

	async probe() {
		return true; // Pure client-side binary parser + SVG writer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertJefToSvg(input, onProgress);
	},
};
