import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convert8xpToText } from "./parser";

export * from "./parser";

/**
 * Texas Instruments TI-83/TI-84 Graphing Calculator Program (.8xp) Engine.
 * Parses the **TI83F* container and de-tokenizes bytecode into formatted
 * TI-BASIC source code with Unicode mathematical symbols.
 */
export const ti8xpToTxtEngine: Engine = {
	id: "extract:8xp-to-txt",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asMarkdown = Boolean(params.markdown);
		return convert8xpToText(input, asMarkdown, onProgress);
	},
};
