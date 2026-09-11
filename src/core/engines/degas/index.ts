import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDegasToPng } from "./parser";
import type { DegasToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Atari ST DEGAS (.pi1, .pi2, .pi3) & DEGAS Elite (.pc1, .pc2, .pc3) image conversion engine.
 * Decodes 320x200 16-color, 640x200 4-color, and 640x400 monochrome bitmaps into 32-bit RGBA PNG.
 */
export const degasToPngEngine: Engine = {
	id: "extract:degas-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const scale =
			typeof params.scale === "number"
				? params.scale
				: Number.parseInt(String(params.scale ?? "1"), 10) || 1;
		const options: DegasToPngOptions = { scale };

		const result = convertDegasToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
