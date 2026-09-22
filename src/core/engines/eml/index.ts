import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertEmlToTxt } from "./parser";

export * from "./parser";

/**
 * RFC 822 message (.eml) to plain-text engine.
 * Walks MIME multiparts, decodes transfer encodings in declared charsets,
 * prefers text/plain with an HTML-stripped fallback, and manifests
 * attachments instead of dumping binary.
 */
export const emlToTxtEngine: Engine = {
	id: "extract:eml-to-txt",

	async probe() {
		return true; // Pure client-side MIME parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertEmlToTxt(input, onProgress);
	},
};
