import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertNScriptToText } from "./parser";

export * from "./parser";

/**
 * NScripter / ONScripter Script Archive (nscript.dat) Engine.
 * Decrypts the 0x84 XOR-obfuscated script stream and extracts clean UTF-8 / Shift-JIS text.
 */
export const nscriptToTxtEngine: Engine = {
	id: "extract:nscript-to-txt",

	async probe() {
		return true; // Pure client-side XOR decrypter
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const asMarkdown = Boolean(params.markdown);
		return convertNScriptToText(input, asMarkdown, onProgress);
	},
};
