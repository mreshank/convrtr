import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertEnexToMarkdown } from "./parser";
import type { EnexConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Evernote ENEX to clean GitHub Flavored Markdown conversion engine.
 */
export const enexToMarkdownEngine: Engine = {
	id: "extract:enex-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter =
			typeof params.frontmatter === "boolean" ? params.frontmatter : true;

		const options: EnexConversionOptions = {
			includeFrontmatter,
		};

		const result = convertEnexToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
