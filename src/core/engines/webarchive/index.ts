import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertWebArchiveToHtml } from "./parser";

/**
 * Apple Safari WebArchive (.webarchive) extractor engine.
 * Decodes Apple Binary Property Lists (bplist00), extracts HTML pages and embedded subresources
 * (CSS stylesheets, images, fonts), and compiles standalone offline HTML with inlined Data URLs.
 */
export const webArchiveToHtmlEngine: Engine = {
	id: "extract:webarchive-to-html",

	async probe() {
		return true; // Pure client-side bplist00 parser and HTML inliner
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertWebArchiveToHtml(input, onProgress);
	},
};
