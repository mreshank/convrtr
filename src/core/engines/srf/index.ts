import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSrfToPng } from "./parser";
import type { SrfConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Sony Alpha RAW (.srf) conversion engine.
 * Decodes Sony Alpha DSLR digital raw image files and extracts high-resolution previews to 32-bit RGBA PNG.
 */
export const srfToPngEngine: Engine = {
	id: "extract:srf-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const extractPreview = params.extractPreview !== false;

		const options: SrfConversionOptions = {
			extractPreview,
		};

		const result = await convertSrfToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
