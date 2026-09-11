import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVtfToPng } from "./parser";

/**
 * Valve Source Engine Texture (.vtf) to PNG conversion engine.
 * Decodes DXT1/BC1, DXT5/BC3, BGRA8888, BGR888, RGBA8888, and I8 game textures
 * used across Half-Life 2, Team Fortress 2, CS:GO, and Garry's Mod into lossless PNGs.
 */
export const vtfToPngEngine: Engine = {
	id: "extract:vtf-to-png",

	async probe() {
		return true; // Pure client-side binary parser & decompressor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertVtfToPng(input, onProgress);
	},
};
