import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCurToPng } from "./parser";

/**
 * Windows Static Cursor (.cur) extractor engine.
 * Unpacks binary CUR / ICO containers, decodes 1bpp, 4bpp, 8bpp, 24bpp, and 32bpp DIB bitmaps
 * with 1-bit AND mask transparency or embedded PNG payloads, and outputs clean transparent PNGs.
 */
export const curToPngEngine: Engine = {
	id: "extract:cur-to-png",

	async probe() {
		return true; // Pure client-side binary CUR parser, DIB decoder, and PNG generator
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertCurToPng(input, onProgress);
	},
};
