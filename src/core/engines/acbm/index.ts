import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAcbmToPng } from "./parser";
import type { AcbmConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Commodore Amiga Continuous Bitmap (ACBM) to PNG conversion engine.
 */
export const acbmToPngEngine: Engine = {
	id: "extract:acbm-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const preserveAlpha =
			typeof params.preserveAlpha === "boolean"
				? params.preserveAlpha
				: params.preserveAlpha !== "false";

		const options: AcbmConversionOptions = {
			preserveAlpha,
		};

		const result = convertAcbmToPng(input, options, onProgress);
		return result.pngBytes.buffer as ArrayBuffer;
	},
};
