import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertOraToPng } from "./parser";
import type { OraConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * OpenRaster (.ora) layered graphics archive to PNG converter engine.
 */
export const oraToPngEngine: Engine = {
	id: "extract:ora-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const preferMergedImage = params.preferMergedImage !== false;

		const options: OraConversionOptions = {
			preferMergedImage,
		};

		const result = convertOraToPng(input, options, onProgress);
		return result.pngBytes.buffer as ArrayBuffer;
	},
};
