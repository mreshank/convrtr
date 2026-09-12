import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertQoiToPng } from "./parser";
import type { QoiConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Quite OK Image (.qoi) to 32-bit RGBA PNG decompression engine.
 */
export const qoiToPngEngine: Engine = {
	id: "extract:qoi-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const forceAlpha =
			typeof params.forceAlpha === "boolean"
				? params.forceAlpha
				: params.forceAlpha === "true";

		const options: QoiConversionOptions = {
			forceAlpha,
		};

		const result = convertQoiToPng(input, options, onProgress);
		return result.pngBytes.buffer as ArrayBuffer;
	},
};
