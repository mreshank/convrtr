import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertLatexToMarkdown } from "./parser";
import type { LatexToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * LaTeX (.tex / .latex) to Markdown conversion engine.
 * Parses document preamble, extracts metadata (title, author, date), preserves
 * inline ($...$) and display ($$...$$) math equations, translates sections, lists,
 * verbatim blocks, and typography into clean GitHub Flavored Markdown.
 */
export const latexToMarkdownEngine: Engine = {
	id: "extract:latex-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter = params.includeFrontmatter !== false;
		const preserveMath = params.preserveMath !== false;
		const options: LatexToMarkdownOptions = {
			includeFrontmatter,
			preserveMath,
		};

		const result = convertLatexToMarkdown(input, options, onProgress);
		const bytes = new TextEncoder().encode(result.markdownText);
		return bytes.slice().buffer as ArrayBuffer;
	},
};
