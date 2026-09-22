import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRppToJson } from "./parser";

export * from "./parser";

/**
 * REAPER project (.rpp / .rpp-bak) session-inventory engine.
 * Parses the plain-text chunk language and summarises tempo, tracks,
 * items + source media, markers, regions and FX as structured JSON —
 * no REAPER install required.
 */
export const rppToJsonEngine: Engine = {
	id: "extract:rpp-to-json",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertRppToJson(input, onProgress);
	},
};
