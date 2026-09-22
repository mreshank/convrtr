import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertIsoToZip } from "./parser";

export * from "./parser";

/**
 * ISO 9660 disc image (.iso) → ZIP-of-files engine.
 * Reads the volume descriptor set, walks the primary (or Joliet) directory
 * tree and copies every file's sectors into a ZIP bit-exact. Honest refusals:
 * UDF, Rock Ridge system-use modelling, and out-of-bounds extents.
 */
export const isoToZipEngine: Engine = {
	id: "extract:iso-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertIsoToZip(input, onProgress);
	},
};
