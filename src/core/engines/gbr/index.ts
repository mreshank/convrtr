import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGbrToPng } from "./parser";

/**
 * GIMP Brush (.gbr) to PNG conversion engine.
 * Decodes GIMP v1 & v2 brush stamps, converting grayscale opacity masks
 * and RGBA brushes into transparent, lossless PNG images for Photoshop,
 * Procreate, Clip Studio Paint, and web design.
 */
export const gbrToPngEngine: Engine = {
	id: "extract:gbr-to-png",

	async probe() {
		return true; // Pure client-side binary parser & PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertGbrToPng(input, onProgress);
	},
};
