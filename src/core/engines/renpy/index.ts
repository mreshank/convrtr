import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractRpaToZip } from "./parser";

/**
 * Extracts and unpacks all visual novel scripts, CGs, music, and voices from
 * a Ren'Py (.rpa) archive into a clean, standard ZIP archive.
 */
export const rpaToZipEngine: Engine = {
	id: "extract:rpa-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return extractRpaToZip(input, onProgress);
	},
};
