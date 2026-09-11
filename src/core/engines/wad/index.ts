import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertWadToZip } from "./parser";

/**
 * id Tech / Doom Engine (.wad) archive extractor. Unpacks sprites, textures,
 * maps, and converts classic Doom DMX sound effects into playable WAV audio.
 */
export const wadToZipEngine: Engine = {
	id: "extract:wad-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and ZIP packer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertWadToZip(input, onProgress);
	},
};
