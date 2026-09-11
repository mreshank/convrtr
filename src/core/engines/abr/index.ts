import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAbrToZip } from "./parser";

/**
 * Adobe Photoshop Brush (.abr) extractor engine.
 * Unpacks legacy and modern sampled brush stamps into transparent PNG files.
 */
export const abrToPngEngine: Engine = {
	id: "extract:abr-to-png",

	async probe() {
		return true; // Pure client-side binary parser, PackBits decompressor, and PNG synthesizer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAbrToZip(input, onProgress);
	},
};
