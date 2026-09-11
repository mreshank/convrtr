import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMacPaintToPng } from "./parser";
import type { MacPaintOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Apple Macintosh MacPaint (.mac / .pntg) image conversion engine.
 * Decompresses 576x576 monochrome PackBits bitmap images into lossless 32-bit RGBA PNGs.
 */
export const macPaintToPngEngine: Engine = {
	id: "extract:macpaint-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const transparentBackground = Boolean(params.transparentBackground);
		const invertColors = Boolean(params.invertColors);

		const options: MacPaintOptions = {
			transparentBackground,
			invertColors,
		};

		const result = convertMacPaintToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};

export const macpaintToPngEngine = macPaintToPngEngine;
