import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDxfToSvg } from "./parser";

/**
 * AutoCAD DXF (.dxf) to SVG conversion engine.
 * Parses 2D CAD & CNC geometry (lines, circles, arcs, polylines, text), computes optimal
 * bounding box viewports, and produces clean, scalable SVG vector graphics in pure client-side TypeScript.
 */
export const dxfToSvgEngine: Engine = {
	id: "extract:dxf-to-svg",

	async probe() {
		return true; // Pure client-side CAD parser & SVG generator
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDxfToSvg(input, onProgress);
	},
};
