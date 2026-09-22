import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMobiToMarkdown } from "./parser";

export * from "./parser";

/**
 * Mobipocket ebook (.mobi/.prc) to Markdown engine.
 * Reads the PalmDB + MOBI + EXTH headers (refusing encrypted or
 * Huffdic-compressed books with specific errors), decodes PalmDoc LZ77
 * text records and flattens the HTML-subset markup to Markdown.
 */
export const mobiToMarkdownEngine: Engine = {
	id: "extract:mobi-to-markdown",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = convertMobiToMarkdown(input, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
