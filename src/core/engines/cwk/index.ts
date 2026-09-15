import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCwkToMarkdown } from "./parser";
import type { CwkConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * ClarisWorks / AppleWorks (.cwk) to GitHub Flavored Markdown extraction engine.
 */
export const cwkToMarkdownEngine: Engine = {
	id: "extract:cwk-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter =
			params.includeFrontmatter === undefined
				? true
				: Boolean(params.includeFrontmatter);

		const options: CwkConversionOptions = {
			includeFrontmatter,
		};

		const result = convertCwkToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer;
	},
};
