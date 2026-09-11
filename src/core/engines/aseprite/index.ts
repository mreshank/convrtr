import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAsepriteToPng } from "./parser";

/**
 * Aseprite (.aseprite / .ase) to PNG conversion engine.
 * Decodes retro and modern pixel art sprite files, layers, palettes, and cels
 * into standard 32-bit RGBA PNG images in 100% pure client-side TypeScript.
 */
export const asepriteToPngEngine: Engine = {
	id: "extract:aseprite-to-png",

	async probe() {
		return true; // Pure client-side binary parser & PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAsepriteToPng(input, onProgress);
	},
};
