import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPsdToPng } from "./parser";

export * from "./parser";

/**
 * Adobe Photoshop (.psd) to PNG engine.
 * Pure-TS reader (no canvas): gray/indexed/RGB, raw + RLE channels, and a
 * simplified normal-blend compositor — the flattened preview without
 * Photoshop and without uploading.
 */
export const psdToPngEngine: Engine = {
	id: "extract:psd-to-png",

	async probe() {
		return true; // Pure client-side binary parser + PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertPsdToPng(input, onProgress);
	},
};
