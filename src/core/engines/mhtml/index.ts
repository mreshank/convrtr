import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMhtmlToHtml } from "./parser";

/**
 * Converts MHTML web archives (.mhtml, .mht) into standalone, universal HTML documents
 * with all images, fonts, and stylesheets inlined as data URLs.
 */
export const mhtmlToHtmlEngine: Engine = {
	id: "extract:mhtml-to-html",

	async probe() {
		return true; // Pure client-side MIME parser and HTML inliner
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertMhtmlToHtml(input, onProgress);
	},
};
