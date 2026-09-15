import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertBpgToPng } from "./parser";
import type { BpgConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Better Portable Graphics (.bpg) image decoding engine.
 * Decodes Fabrice Bellard's HEVC-derived high-efficiency images into standard 32-bit RGBA PNG.
 */
export const bpgToPngEngine: Engine = {
	id: "extract:bpg-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const options: BpgConversionOptions = {};
		const result = convertBpgToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
