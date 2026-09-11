import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseBibtex } from "./parser";
import type { BibtexToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * BibTeX (.bib) bibliography conversion engine.
 * Parses academic citation entries (@article, @book, @inproceedings), decodes LaTeX accents,
 * and formats clean GitHub Flavored Markdown tables, reading lists, or citation JSON.
 */
export const bibtexToMarkdownEngine: Engine = {
	id: "extract:bibtex-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress?.(0.2, "PARSING_BIBTEX");
		const format =
			params.format === "list"
				? "list"
				: params.format === "json"
					? "json"
					: "table";
		const includeAbstract =
			params.includeAbstract === true || params.includeAbstract === "true";
		const options: BibtexToMarkdownOptions = { format, includeAbstract };

		const result = parseBibtex(input, options);
		onProgress?.(1.0, "COMPLETE");

		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
