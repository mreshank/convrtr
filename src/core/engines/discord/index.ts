import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDiscordToMarkdown } from "./parser";

export * from "./parser";

/**
 * DiscordChatExporter JSON to Markdown engine.
 * Renders typed messages, attachments, embeds and reactions as a dated,
 * archival Markdown document with a participant roster.
 */
export const discordToMarkdownEngine: Engine = {
	id: "extract:discord-to-markdown",

	async probe() {
		return true; // Pure client-side JSON parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertDiscordToMarkdown(input, onProgress);
	},
};
