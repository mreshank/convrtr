import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertLdifToCsv } from "./parser";

export * from "./parser";

/**
 * LDAP LDIF (.ldif) to CSV engine.
 * Unfolds RFC 2849 lines, decodes base64 values and flattens entries —
 * multi-valued attributes joined, changetype lines skipped.
 */
export const ldifToCsvEngine: Engine = {
	id: "extract:ldif-to-csv",

	async probe() {
		return true; // Pure client-side text parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertLdifToCsv(input, onProgress);
	},
};
