import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSolToJson } from "./parser";

export * from "./parser";

/**
 * Adobe Flash Local Shared Object (.sol) to JSON Engine.
 * Parses binary AMF0/AMF3 serialized data structures from Flash cookies
 * and game save files, exporting human-readable formatted JSON.
 */
export const solToJsonEngine: Engine = {
	id: "extract:sol-to-json",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const pretty = params.pretty !== false;
		return convertSolToJson(input, pretty, onProgress);
	},
};
