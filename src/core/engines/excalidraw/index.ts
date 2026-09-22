import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertExcalidrawToSvg } from "./parser";

export * from "./parser";

/**
 * Excalidraw scene (.excalidraw) to SVG engine.
 * Renders shapes, text, arrows and embedded images as clean simplified
 * vector geometry — faithful where it matters, openly flattened where the
 * editor's hand-drawn style can't transfer.
 */
export const excalidrawToSvgEngine: Engine = {
	id: "extract:excalidraw-to-svg",

	async probe() {
		return true; // Pure client-side JSON parser + SVG writer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertExcalidrawToSvg(input, onProgress);
	},
};
