import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCgmToSvg } from "./parser";
import type { CgmConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Computer Graphics Metafile (ISO/IEC 8632) to SVG conversion engine.
 */
export const cgmToSvgEngine: Engine = {
	id: "extract:cgm-to-svg",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const scaleLineWidth =
			typeof params.scaleLineWidth === "number"
				? params.scaleLineWidth
				: undefined;

		const options: CgmConversionOptions = {
			scaleLineWidth,
		};

		const result = convertCgmToSvg(input, options, onProgress);
		return new TextEncoder().encode(result.svg).buffer as ArrayBuffer;
	},
};
