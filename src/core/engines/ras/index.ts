import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRasToPng } from "./parser";

/**
 * Sun Raster (.ras, .sun, .rast) to PNG conversion engine.
 * Decodes 1/8/24/32-bit vintage SunOS/Solaris raster bitmaps, colormapped graphics,
 * and RLE-compressed images to standard 32-bit RGBA PNGs.
 */
export const rasToPngEngine: Engine = {
	id: "extract:ras-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertRasToPng(input, onProgress);
	},
};
