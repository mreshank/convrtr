import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPltToSvg } from "./parser";

export * from "./parser";

/**
 * HP-GL Plotter Vector (.plt / .hpgl) to SVG Engine.
 * Converts architectural, CNC, and vinyl cutter vector plot files into scalable W3C SVG paths.
 */
export const pltToSvgEngine: Engine = {
	id: "extract:plt-to-svg",

	async probe() {
		return true; // Pure client-side vector interpreter
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertPltToSvg(input, onProgress);
	},
};
