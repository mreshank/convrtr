import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertKoaToPng } from "./parser";
import type { KoaToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Commodore 64 KoalaPainter (.koa) image conversion engine.
 * Decodes 10,003-byte multi-color bitmap graphics into 32-bit RGBA PNG.
 */
export const koaToPngEngine: Engine = {
	id: "extract:koa-to-png",

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
		const palette = params.palette === "colodore" ? "colodore" : "pepto";
		const options: KoaToPngOptions = { scale, palette };

		const result = convertKoaToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
