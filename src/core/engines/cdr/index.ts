import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCdrToPng } from "./parser";

/**
 * CorelDRAW (.cdr) artwork preview extractor engine.
 * Unpacks modern CorelDRAW X4+ through 2024 ZIP containers and legacy RIFF files,
 * extracting the high-resolution composite preview PNG without requiring CorelDRAW.
 */
export const cdrToPngEngine: Engine = {
	id: "extract:cdr-to-png",

	async probe() {
		return true; // Pure client-side ZIP/RIFF parser & image extractor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertCdrToPng(input, onProgress);
	},
};
