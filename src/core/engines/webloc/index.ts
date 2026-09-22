import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertWebloc, type WeblocOutputFormat } from "./parser";

export * from "./parser";

/**
 * macOS Safari Internet Location (.webloc) Engine.
 * Extracts the target URL from Apple XML and binary property lists,
 * generating standard Windows .url shortcuts, HTML redirects, or Markdown links.
 */
export const weblocToUrlEngine: Engine = {
	id: "extract:webloc-to-url",

	async probe() {
		return true; // Pure client-side text/binary parser
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const format = (params.format as WeblocOutputFormat) || "url";
		return convertWebloc(input, format, onProgress);
	},
};
