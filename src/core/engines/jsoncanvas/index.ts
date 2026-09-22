import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertCanvasToMarkdown } from "./parser";

export * from "./parser";

/**
 * Obsidian / JSON Canvas (.canvas) to Markdown engine.
 * Flattens spatial nodes and labelled edges into titled sections plus a
 * connections list — the board's thinking, readable anywhere.
 */
export const canvasToMarkdownEngine: Engine = {
	id: "extract:canvas-to-markdown",

	async probe() {
		return true; // Pure client-side JSON parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertCanvasToMarkdown(input, onProgress);
	},
};
