import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertTgaToPng } from "./parser";

/**
 * Truevision TGA (.tga) to PNG conversion engine.
 * Decodes 8/15/16/24/32-bit uncompressed and RLE compressed TGA game textures,
 * sprites, and artwork, converting them into lossless PNG images.
 */
export const tgaToPngEngine: Engine = {
	id: "extract:tga-to-png",

	async probe() {
		return true; // Pure client-side binary parser & PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertTgaToPng(input, onProgress);
	},
};
