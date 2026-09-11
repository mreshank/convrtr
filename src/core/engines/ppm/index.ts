import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPpmToPng } from "./parser";

/**
 * Netpbm PPM, PGM, PBM, and PNM raster conversion engine.
 * Converts Netpbm images (P1 through P7 formats) to standard lossless 32-bit RGBA PNG.
 */
export const ppmToPngEngine: Engine = {
	id: "extract:ppm-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.1, "PARSING");
		const invertMonochrome = Boolean(params.invertMonochrome);
		const png = convertPpmToPng(input, { invertMonochrome });
		onProgress(1, "COMPLETE");
		return png.slice().buffer as ArrayBuffer;
	},
};

export { convertPpmToPng, parseNetpbm } from "./parser";
export type * from "./types";
