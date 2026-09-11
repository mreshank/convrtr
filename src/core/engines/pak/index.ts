import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPakToZip } from "./parser";

/**
 * id Tech 2 / Quake / GoldSrc (Half-Life, Counter-Strike) PAK archive extractor.
 * Unpacks game models, textures, sounds, and scripts into a structured ZIP file.
 */
export const pakToZipEngine: Engine = {
	id: "extract:pak-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and ZIP packer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertPakToZip(input, onProgress);
	},
};
