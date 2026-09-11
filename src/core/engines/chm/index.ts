import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertChmToZip } from "./parser";

/**
 * Microsoft Compiled HTML Help (.chm) decompiler engine.
 * Unpacks ITSF archive directory chunks, extracts embedded HTML pages, CSS styles,
 * and media assets, and packages them into an organized ZIP archive.
 */
export const chmToZipEngine: Engine = {
	id: "extract:chm-to-zip",

	async probe() {
		return true; // Pure client-side binary parser & ZIP extractor
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertChmToZip(input, onProgress);
	},
};
