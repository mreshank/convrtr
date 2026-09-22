import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXdToPng } from "./parser";

export * from "./parser";

/**
 * Adobe XD (.xd) artboard-preview extractor engine.
 * Unpacks the XD ZIP container and returns the rendered preview PNG
 * bit-exact — no Adobe subscription required.
 */
export const xdToPngEngine: Engine = {
	id: "extract:xd-to-png",

	async probe() {
		return true; // Pure client-side ZIP parser & image extractor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertXdToPng(input, onProgress);
	},
};
