import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseIco } from "./parser";
import type { IcoToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Microsoft Windows Icon (.ico / favicon.ico) extraction engine.
 * Unpacks multi-resolution icons and extracts the highest-resolution
 * (or user-preferred) icon frame as a lossless 32-bit RGBA PNG.
 */
export const icoToPngEngine: Engine = {
	id: "extract:ico-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.1, "PARSING");
		const rawSize = Number(params.preferredSize);
		const preferredSize =
			Number.isFinite(rawSize) && rawSize > 0 ? rawSize : undefined;
		const options: IcoToPngOptions = { preferredSize };
		const result = parseIco(input, options);
		onProgress(1.0, "COMPLETE");
		return result.pngData.slice().buffer as ArrayBuffer;
	},
};
