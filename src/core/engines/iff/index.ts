import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertIffToPng } from "./parser";

/**
 * Commodore Amiga / Electronic Arts IFF-ILBM / PBM to PNG conversion engine.
 * Decodes retro Amiga 1-8 bitplane, Extra Half-Brite (EHB), Hold-And-Modify (HAM6),
 * 24-bit TrueColor, and ByteRun1 RLE images into standard 32-bit RGBA PNGs.
 */
export const iffToPngEngine: Engine = {
	id: "extract:iff-to-png",

	async probe() {
		return true; // Pure client-side binary parser & PNG encoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertIffToPng(input, onProgress);
	},
};
