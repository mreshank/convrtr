import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertManToMarkdown } from "./parser";
import type { ManConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Unix Manual Page (.man / .1..9) conversion engine.
 * Converts classic roff, man, and mdoc formatted documentation files into GitHub Flavored Markdown.
 */
export const manToMarkdownEngine: Engine = {
	id: "extract:man-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const preserveRawMacros = params.preserveRawMacros === true;

		const options: ManConversionOptions = {
			preserveRawMacros,
		};

		const result = convertManToMarkdown(input, options, onProgress);
		const encoded = new TextEncoder().encode(result.markdown);
		return encoded.buffer.slice(
			encoded.byteOffset,
			encoded.byteOffset + encoded.byteLength,
		) as ArrayBuffer;
	},
};
