import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSgiToPng } from "./parser";

/**
 * Silicon Graphics SGI (.rgb, .rgba, .sgi, .bw) to PNG conversion engine.
 * Decodes 1/2/3/4-channel uncompressed and RLE compressed IRIX workstation textures,
 * Maya/Softimage frames, and retro 3D graphics into standard 32-bit RGBA PNGs.
 */
export const sgiToPngEngine: Engine = {
	id: "extract:sgi-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertSgiToPng(input, onProgress);
	},
};
