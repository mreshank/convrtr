import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertPalmdocToMarkdown } from "./parser";
import type { PalmDocConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Palm OS PalmDoc Database (.pdb) to GitHub Flavored Markdown extraction engine.
 */
export const palmdocToMarkdownEngine: Engine = {
	id: "extract:pdb-to-markdown",

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

		const detectHeadings =
			typeof params.detectHeadings === "boolean"
				? params.detectHeadings
				: params.detectHeadings !== "false";

		const options: PalmDocConversionOptions = {
			includeFrontmatter,
			detectHeadings,
		};

		const result = convertPalmdocToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
