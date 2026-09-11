import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertZxToPng } from "./parser";
import type { ZxToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Sinclair ZX Spectrum (.scr) screen conversion engine.
 * Decodes 6,912-byte non-linear interlaced screen memory buffers and color attributes
 * into crisp 32-bit RGBA PNG graphics.
 */
export const zxToPngEngine: Engine = {
	id: "extract:zx-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const scale =
			typeof params.scale === "number"
				? params.scale
				: Number.parseInt(String(params.scale ?? "1"), 10) || 1;
		const invertColors = params.invertColors === true;
		const options: ZxToPngOptions = { scale, invertColors };

		const result = convertZxToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
