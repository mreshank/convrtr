import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertTexinfoToMarkdown } from "./parser";
import type { TexinfoConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * GNU Texinfo (.texi / .texinfo) conversion engine.
 * Converts GNU project technical manuals, software guides, and documentation into GitHub Flavored Markdown.
 */
export const texinfoToMarkdownEngine: Engine = {
	id: "extract:texinfo-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const preserveNodeAnchors = params.preserveNodeAnchors === true;

		const options: TexinfoConversionOptions = {
			preserveNodeAnchors,
		};

		const result = convertTexinfoToMarkdown(input, options, onProgress);
		const encoded = new TextEncoder().encode(result.markdown);
		return encoded.buffer.slice(
			encoded.byteOffset,
			encoded.byteOffset + encoded.byteLength,
		) as ArrayBuffer;
	},
};
