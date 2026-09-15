import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertRtfdToMarkdown } from "./parser";
import type { RtfdToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Apple Rich Text Format Directory (.rtfd) conversion engine.
 * Unpacks macOS TextEdit / NeXTSTEP RTFD bundles, parses embedded RTF streams,
 * resolves graphic attachments, and renders GitHub Flavored Markdown.
 */
export const rtfdToMarkdownEngine: Engine = {
	id: "extract:rtfd-to-markdown",

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

		const options: RtfdToMarkdownOptions = {
			includeFrontmatter,
		};

		const result = convertRtfdToMarkdown(input, options, onProgress);
		return result.markdownBuffer;
	},
};
