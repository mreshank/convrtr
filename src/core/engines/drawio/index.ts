import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDrawioToSvg } from "./parser";

export * from "./parser";

/**
 * diagrams.net (.drawio) → SVG engine.
 * Inflates the model XML (drawio saves compressed with zlib by default) and
 * renders the mxGraphModel cells to a simplified SVG: page-paced rectangle,
 * ellipse, rhombus and rounded shapes with labels plus straight-waypoint
 * connector lines. Rich HTML labels and the orthogonal/entity-relation edge
 * layout algorithms are flattened — see the parser docs for the honest scope.
 */
export const drawioToSvgEngine: Engine = {
	id: "extract:drawio-to-svg",

	async probe() {
		return true; // Pure client-side XML inflate + geometry render
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDrawioToSvg(input, onProgress);
	},
};
