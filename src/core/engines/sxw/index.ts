import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSxwToMarkdown } from "./parser";
import type { SxwToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * OpenOffice.org 1.x / StarOffice Writer Document (.sxw) extraction engine.
 * Unpacks pre-ODF XML ZIP packages into clean GitHub Flavored Markdown.
 */
export const sxwToMarkdownEngine: Engine = {
	id: "extract:sxw-to-markdown",

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

		const options: SxwToMarkdownOptions = {
			includeFrontmatter,
		};

		const result = convertSxwToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
