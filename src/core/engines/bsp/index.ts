import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertBspToZip } from "./parser";

/**
 * Valve Source & GoldSrc BSP map asset extraction engine.
 * Unpacks embedded PKZIP pakfiles (Lump 40) containing custom textures, materials (.vmt/.vtf),
 * models (.mdl), soundscapes, entity scripts, and GoldSrc miptex textures into a ZIP archive.
 */
export const bspToZipEngine: Engine = {
	id: "extract:bsp-to-zip",

	async probe() {
		return true; // Pure client-side binary parser & ZIP extractor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertBspToZip(input, onProgress);
	},
};
