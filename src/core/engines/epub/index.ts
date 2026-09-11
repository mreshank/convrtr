import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertEpubToMarkdown } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * EPUB Electronic Publication to Markdown conversion engine.
 * Unpacks EPUB containers, parses OPF package manifests, follows spine reading order,
 * converts chapter markup into clean semantic Markdown, and generates frontmatter metadata.
 */
export const epubToMarkdownEngine: Engine = {
	id: "extract:epub-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const includeFrontmatter = params.includeFrontmatter !== false;
		const includeDividers = params.includeDividers !== false;
		const result = convertEpubToMarkdown(
			input,
			{ includeFrontmatter, includeDividers },
			onProgress,
		);
		const bytes = new TextEncoder().encode(result.markdownText);
		return bytes.slice().buffer as ArrayBuffer;
	},
};
