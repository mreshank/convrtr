import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMngToPng } from "./parser";
import type { MngConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Multiple-image Network Graphics (.mng) conversion engine.
 * Extracts animated frame sequences and subframes into standalone 32-bit RGBA PNG images.
 */
export const mngToPngEngine: Engine = {
	id: "extract:mng-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const frameIndex =
			typeof params.frameIndex === "number"
				? params.frameIndex
				: Number.parseInt(String(params.frameIndex ?? "0"), 10) || 0;

		const options: MngConversionOptions = {
			frameIndex,
		};

		const result = convertMngToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
