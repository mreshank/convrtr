import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertZabwToMarkdown } from "./parser";
import type { ZabwToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * AbiWord Compressed Document (.zabw) conversion engine.
 * Decompresses Gzip-packed XML and translates formatted paragraphs,
 * tables, lists, and metadata into GFM Markdown.
 */
export const zabwToMarkdownEngine: Engine = {
	id: "extract:zabw-to-markdown",

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

		const options: ZabwToMarkdownOptions = {
			includeFrontmatter,
		};

		const result = convertZabwToMarkdown(input, options, onProgress);
		return result.markdownBuffer;
	},
};
