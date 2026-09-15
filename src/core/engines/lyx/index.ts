import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertLyxToMarkdown } from "./parser";
import type { LyxConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * LyX Document (.lyx) conversion engine.
 * Converts LyX scientific document processor trees, LaTeX layouts, formulas, and tabular insets to GitHub Flavored Markdown.
 */
export const lyxToMarkdownEngine: Engine = {
	id: "extract:lyx-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter =
			params.includeFrontmatter !== false &&
			params.includeFrontmatter !== "false";

		const options: LyxConversionOptions = {
			includeFrontmatter,
		};

		const result = convertLyxToMarkdown(input, options, onProgress);
		return result.markdownBuffer;
	},
};
