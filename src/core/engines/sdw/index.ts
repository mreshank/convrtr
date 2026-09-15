import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSdwToMarkdown } from "./parser";
import type { SdwConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * StarWriter / StarOffice (.sdw) document extraction engine.
 * Unpacks OLE 2.0 compound streams and formats text, headings, and metadata into GitHub Flavored Markdown.
 */
export const sdwToMarkdownEngine: Engine = {
	id: "extract:sdw-to-markdown",

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

		const options: SdwConversionOptions = {
			includeFrontmatter,
		};

		const result = convertSdwToMarkdown(input, options, onProgress);
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
