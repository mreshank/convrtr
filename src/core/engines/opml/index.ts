import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertOpmlToMarkdown } from "./parser";
import type { OpmlConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Outline Processor Markup Language (.opml) to Markdown converter engine.
 */
export const opmlToMarkdownEngine: Engine = {
	id: "extract:opml-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter = params.includeFrontmatter !== false;
		const renderFeedsAsTable = params.renderFeedsAsTable !== false;

		const options: OpmlConversionOptions = {
			includeFrontmatter,
			renderFeedsAsTable,
		};

		const result = convertOpmlToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
