import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertEmlxToEml } from "./parser";

export * from "./parser";

/**
 * Apple Mail (.emlx) to EML engine.
 * Strips the length-prefix + plist envelope and returns the embedded
 * RFC 822 message bit-exact.
 */
export const emlxToEmlEngine: Engine = {
	id: "extract:emlx-to-eml",

	async probe() {
		return true; // Pure client-side byte slicer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertEmlxToEml(input, onProgress);
	},
};
