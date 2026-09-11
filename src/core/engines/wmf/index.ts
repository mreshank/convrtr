import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertWmfToSvg } from "./parser";

/**
 * Windows Metafile (.wmf) to SVG conversion engine.
 * Converts legacy 16-bit Windows Metafile vector graphics and clip art to clean modern SVG.
 */
export const wmfToSvgEngine: Engine = {
	id: "extract:wmf-to-svg",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertWmfToSvg(input, onProgress);
	},
};

export { convertWmfToSvg, parseWmf } from "./parser";
