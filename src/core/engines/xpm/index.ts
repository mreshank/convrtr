import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXpmToPng } from "./parser";

/**
 * X11 X PixMap (.xpm) to PNG conversion engine.
 * Converts vintage X11 C-source color icons and pixmaps to crisp transparent PNGs.
 */
export const xpmToPngEngine: Engine = {
	id: "extract:xpm-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertXpmToPng(input, onProgress);
	},
};

export { convertXpmToPng, parseXpm } from "./parser";
