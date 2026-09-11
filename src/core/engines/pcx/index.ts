import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPcxToPng } from "./parser";

/**
 * ZSoft PCX (.pcx) to PNG conversion engine.
 * Decodes vintage 1/4/8/24-bit uncompressed and RLE-compressed PCX bitmap images,
 * textures, and game sprites, converting them into standard 32-bit RGBA PNGs.
 */
export const pcxToPngEngine: Engine = {
	id: "extract:pcx-to-png",

	async probe() {
		return true; // Pure client-side binary parser & PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertPcxToPng(input, onProgress);
	},
};
