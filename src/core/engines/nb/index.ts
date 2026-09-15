import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertNbToMarkdown } from "./parser";
import type { NbConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Wolfram Mathematica Notebook (.nb) conversion engine.
 * Parses hierarchical Mathematica notebook cell expression trees and renders GitHub Flavored Markdown.
 */
export const nbToMarkdownEngine: Engine = {
	id: "extract:nb-to-markdown",

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

		const renderOutputs =
			params.renderOutputs !== false && params.renderOutputs !== "false";

		const codeLanguage =
			typeof params.codeLanguage === "string" && params.codeLanguage.length > 0
				? params.codeLanguage
				: "mathematica";

		const options: NbConversionOptions = {
			includeFrontmatter,
			renderOutputs,
			codeLanguage,
		};

		const result = convertNbToMarkdown(input, options, onProgress);
		return result.markdownBuffer;
	},
};
