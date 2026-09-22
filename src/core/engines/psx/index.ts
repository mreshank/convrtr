import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMcrToZip } from "./parser";

export * from "./parser";

/**
 * PlayStation 1 Memory Card (.mcr / .mcd / .srm / .vmp) Save Carver Engine.
 * Extracts individual .mcs save files, raw blocks, decoded 16x16 icon PNGs,
 * and JSON/Markdown manifests from 128KB PS1 memory card images.
 */
export const mcrToZipEngine: Engine = {
	id: "extract:mcr-to-zip",

	async probe() {
		return true; // Pure client-side binary block carver
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asJson = Boolean(params.json);
		return convertMcrToZip(input, asJson, onProgress);
	},
};
