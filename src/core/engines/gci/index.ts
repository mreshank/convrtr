import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGci } from "./parser";

export * from "./parser";

/**
 * Nintendo GameCube Save File (.gci / .raw / .gcp) Extractor Engine.
 * Parses GameCube memory card saves, metadata, Shift-JIS game comments,
 * and exports structured JSON or extracted .gci ZIP packages.
 */
export const gciToJsonEngine: Engine = {
	id: "extract:gci-to-json",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asZip = Boolean(params.zip);
		return convertGci(input, asZip, onProgress);
	},
};
