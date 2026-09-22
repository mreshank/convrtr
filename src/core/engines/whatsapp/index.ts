import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertWhatsappToMarkdown } from "./parser";

export * from "./parser";

/**
 * WhatsApp chat export (.txt / .zip) to Markdown engine.
 * Parses iOS + Android timestamp families, groups by date, lists ZIP media —
 * an archival/PKM-friendly alternative to the wall-of-text export.
 */
export const whatsappToMarkdownEngine: Engine = {
	id: "extract:whatsapp-to-markdown",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertWhatsappToMarkdown(input, onProgress);
	},
};
