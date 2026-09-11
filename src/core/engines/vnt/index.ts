import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVntToTxt } from "./parser";

/**
 * Mobile Phone vNote (.vnt) memo extractor engine.
 * Decodes Quoted-Printable and Base64 encoded mobile memos from Samsung S-Memo,
 * Sony Ericsson, and Nokia phones into clean UTF-8 text.
 */
export const vntToTxtEngine: Engine = {
	id: "extract:vnt-to-txt",

	async probe() {
		return true; // Pure client-side vNote string and quoted-printable decoder
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertVntToTxt(input, onProgress);
	},
};
