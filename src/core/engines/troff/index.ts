import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertTroffToMarkdown } from "./parser";
import type { TroffConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * AT&T troff (.tr / .troff / .t) conversion engine.
 * Converts classic Unix Bell Labs typography documents, technical papers, and roff macros into GitHub Flavored Markdown.
 */
export const troffToMarkdownEngine: Engine = {
	id: "extract:troff-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const preserveRawRequests = params.preserveRawRequests === true;

		const options: TroffConversionOptions = {
			preserveRawRequests,
		};

		const result = convertTroffToMarkdown(input, options, onProgress);
		const encoded = new TextEncoder().encode(result.markdown);
		return encoded.buffer.slice(
			encoded.byteOffset,
			encoded.byteOffset + encoded.byteLength,
		) as ArrayBuffer;
	},
};
