import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertNeoToPng } from "./parser";
import type { NeoConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Atari ST NeoChrome (.neo) picture to 32-bit RGBA PNG graphics engine.
 */
export const neoToPngEngine: Engine = {
	id: "extract:neo-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const aspectCorrect =
			typeof params.aspectCorrect === "boolean"
				? params.aspectCorrect
				: params.aspectCorrect !== "false";

		const options: NeoConversionOptions = {
			aspectCorrect,
		};

		const result = convertNeoToPng(input, options, onProgress);
		return result.pngBytes.buffer as ArrayBuffer;
	},
};
