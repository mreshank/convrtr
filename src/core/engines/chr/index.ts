import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertChrToPng } from "./parser";
import type { ChrToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Nintendo NES 2bpp CHR tile graphics conversion engine.
 * Decodes 8x8 pattern tables into 32-bit RGBA sprite sheets with retro color palettes.
 */
export const chrToPngEngine: Engine = {
	id: "extract:chr-to-png",

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
		const palette =
			params.palette === "gameboy"
				? "gameboy"
				: params.palette === "mario"
					? "mario"
					: "grayscale";
		const options: ChrToPngOptions = { scale, palette };

		const result = convertChrToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
