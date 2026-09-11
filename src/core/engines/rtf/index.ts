import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRtfToMarkdown } from "./parser";
import type { RtfToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Microsoft Rich Text Format (.rtf) to Markdown conversion engine.
 * Parses nested RTF groups, decodes Unicode codepoint escapes (\uN),
 * and converts bold, italic, strikethrough, headings, and lists into semantic Markdown.
 */
export const rtfToMarkdownEngine: Engine = {
	id: "extract:rtf-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter = params.includeFrontmatter !== false;
		const options: RtfToMarkdownOptions = { includeFrontmatter };

		const result = convertRtfToMarkdown(input, options, onProgress);
		const bytes = new TextEncoder().encode(result.markdownText);
		return bytes.slice().buffer as ArrayBuffer;
	},
};
