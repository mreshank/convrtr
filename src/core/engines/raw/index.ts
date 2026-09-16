import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRawToPng } from "./parser";
import type { RawConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Universal Camera RAW / DNG (.raw / .dng) conversion engine.
 * Extracts embedded high-resolution preview and sensor frames to 32-bit RGBA PNG.
 */
export const rawToPngEngine: Engine = {
	id: "extract:raw-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const options: RawConversionOptions = {
			quality: "preview",
		};

		const result = await convertRawToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
