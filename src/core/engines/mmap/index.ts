import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMmapToMarkdown } from "./parser";

export * from "./parser";

/**
 * MindManager (.mmap) to Markdown engine.
 * Unpacks Document.xml and walks the topic tree into a task-aware outline —
 * no MindManager licence required.
 */
export const mmapToMarkdownEngine: Engine = {
	id: "extract:mmap-to-markdown",

	async probe() {
		return true; // Pure client-side ZIP + tolerant XML parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertMmapToMarkdown(input, onProgress);
	},
};
