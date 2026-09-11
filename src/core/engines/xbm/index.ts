import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXbmToPng } from "./parser";

/**
 * X11 X BitMap (.xbm) to PNG conversion engine.
 * Decodes monochrome C-source bitmap arrays (used in X11, Arduino, ESP32, and embedded OLEDs)
 * into modern lossless 32-bit RGBA PNG images in 100% pure client-side TypeScript.
 */
export const xbmToPngEngine: Engine = {
	id: "extract:xbm-to-png",

	async probe() {
		return true; // Pure client-side C-code parser & PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertXbmToPng(input, onProgress);
	},
};
