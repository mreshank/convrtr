import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseXcur } from "./parser";
import type { XcurToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * X11 Mouse Cursor (.xcur, .cursor) image extraction engine.
 * Decodes multi-resolution Xcursor chunks and un-premultiplies ARGB pixels into lossless 32-bit RGBA PNG.
 */
export const xcurToPngEngine: Engine = {
	id: "extract:xcur-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const size =
			typeof params.size === "number"
				? params.size
				: Number.parseInt(String(params.size ?? "0"), 10) || undefined;

		const options: XcurToPngOptions = {
			size,
		};

		const result = parseXcur(input, options, onProgress);
		return result.pngBuffer;
	},
};
