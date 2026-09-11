import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXMindToMarkdown } from "./parser";

/**
 * Extracts and converts XMind (.xmind) mindmaps into clean hierarchical Markdown.
 */
export const xmindToMarkdownEngine: Engine = {
	id: "extract:xmind-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "EXTRACT");
		const md = convertXMindToMarkdown(input);
		onProgress(1, "DONE");
		return new TextEncoder().encode(md).buffer;
	},
};
