import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMboxToZip } from "./parser";

export * from "./parser";

/**
 * mboxrd mailbox (.mbox) splitter engine.
 * Cuts on `From ` separators, unescapes `>From`, and packs each message
 * bit-exact into a ZIP of individually importable `.eml` files.
 */
export const mboxToZipEngine: Engine = {
	id: "extract:mbox-to-zip",

	async probe() {
		return true; // Pure client-side text splitter and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertMboxToZip(input, onProgress);
	},
};
