import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSvgzToSvg } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * SVGZ (Compressed SVG) to SVG extraction engine.
 * Inflates gzip-compressed vector graphics into standard clean SVG client-side.
 */
export const svgzToSvgEngine: Engine = {
	id: "extract:svgz-to-svg",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.2, "Decompressing gzip archive");
		const result = convertSvgzToSvg(input);
		onProgress(0.9, "Extracting SVG vector markup");
		const out = result.svgBuffer;
		onProgress(1.0, "Decompression complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
