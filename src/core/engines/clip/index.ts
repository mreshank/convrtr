import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractClipPreview } from "./parser";

/**
 * Extracts the full-resolution composite artwork PNG from Clip Studio Paint (.clip) files.
 */
export const clipToPngEngine: Engine = {
	id: "extract:clip-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "SCAN");
		const output = extractClipPreview(input);
		onProgress(1, "DONE");
		return output;
	},
};
