import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertIworkToZip } from "./parser";

export * from "./parser";

/**
 * Apple iWork (.pages / .key / .numbers) preview engine.
 * Unpacks the ZIP container and re-zips the embedded page preview (and
 * Quick Look render, when present) bit-exact. The document body itself is a
 * private protobuf and stays unclaimed — this is the render, honestly scoped.
 */
export const iworkPreviewToZipEngine: Engine = {
	id: "extract:iwork-preview-to-zip",

	async probe() {
		return true; // Pure client-side ZIP parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertIworkToZip(input, onProgress);
	},
};
