import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVdaToPng } from "./parser";
import type { VdaConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Truevision VDA / ICB / VST conversion engine.
 * Decodes historical Truevision Video Display Adapter and TARGA variants
 * into lossless transparent 32-bit RGBA PNG images.
 */
export const vdaToPngEngine: Engine = {
	id: "extract:vda-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const options: VdaConversionOptions = {};
		const result = convertVdaToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
