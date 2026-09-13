import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertHwpToMarkdown } from "./parser";
import type { HwpConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Hangul Word Processor (.hwp 5.x) to GitHub Flavored Markdown extraction engine.
 */
export const hwpToMarkdownEngine: Engine = {
	id: "extract:hwp-to-markdown",

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

		const options: HwpConversionOptions = {
			includeFrontmatter,
		};

		const result = convertHwpToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
