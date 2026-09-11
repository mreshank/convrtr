import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDdsToPng } from "./parser";

/**
 * DirectDraw Surface (.dds) texture decoder. Converts game textures, normal maps,
 * and 3D assets (DXT1, DXT3, DXT5, BC5, RGBA) into standard PNG images directly in the browser.
 */
export const ddsToPngEngine: Engine = {
	id: "extract:dds-to-png",

	async probe() {
		return true; // Pure client-side DXT/BC decompressor and PNG synthesizer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDdsToPng(input, onProgress);
	},
};
