import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertTelegramToMarkdown } from "./parser";

export * from "./parser";

/**
 * Telegram Desktop JSON export to Markdown engine.
 * Handles single-chat and full-export shapes, rich-text parts, service
 * events and media markers — an archival/PKM-friendly alternative to the
 * HTML export.
 */
export const telegramToMarkdownEngine: Engine = {
	id: "extract:telegram-to-markdown",

	async probe() {
		return true; // Pure client-side JSON parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertTelegramToMarkdown(input, onProgress);
	},
};
