import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertNfoToHtml } from "./parser";
import type { NfoToHtmlOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * IBM Code Page 437 (CP437) NFO / DIZ scene art to HTML conversion engine.
 * Decodes ASCII/ANSI box-drawing characters and renders responsive terminal HTML or UTF-8 text.
 */
export const nfoToHtmlEngine: Engine = {
	id: "extract:nfo-to-html",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const theme =
			params.theme === "matrix"
				? "matrix"
				: params.theme === "amber"
					? "amber"
					: params.theme === "plain"
						? "plain"
						: "dark";
		const format = params.format === "txt" ? "txt" : "html";
		const options: NfoToHtmlOptions = { theme, format };

		const result = convertNfoToHtml(input, options, onProgress);
		return new TextEncoder().encode(result.content).buffer as ArrayBuffer;
	},
};
