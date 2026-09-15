import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPcdToPng } from "./parser";
import type { PcdConversionOptions, PcdResolution } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Kodak Photo CD (.pcd) conversion engine.
 * Decodes multi-resolution PhotoYCC image planes into 32-bit RGBA PNG.
 */
export const pcdToPngEngine: Engine = {
	id: "extract:pcd-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const rawRes = String(params.resolution ?? "base");
		const resolution: PcdResolution =
			rawRes === "base16" || rawRes === "base4" || rawRes === "base"
				? rawRes
				: "base";

		const options: PcdConversionOptions = {
			resolution,
		};

		const result = convertPcdToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
