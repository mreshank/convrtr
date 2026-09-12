import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertFb2ToMarkdown } from "./parser";
import type { Fb2ConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * FictionBook 2.0 (.fb2) e-book to Markdown conversion engine.
 */
export const fb2ToMarkdownEngine: Engine = {
	id: "extract:fb2-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter =
			typeof params.includeFrontmatter === "boolean"
				? params.includeFrontmatter
				: params.includeFrontmatter !== "false";

		const extractImages =
			typeof params.extractImages === "boolean"
				? params.extractImages
				: params.extractImages !== "false";

		const options: Fb2ConversionOptions = {
			includeFrontmatter,
			extractImages,
		};

		const result = convertFb2ToMarkdown(input, options, onProgress);
		const enc = new TextEncoder();
		return enc.encode(result.markdown).buffer as ArrayBuffer;
	},
};
