import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertMatToZip } from "./parser";

export * from "./parser";

/**
 * MATLAB v5 workspace (.mat) to ZIP-of-CSVs engine.
 * Reads miMATRIX variables (2D real numerics, chars, logicals) into
 * per-variable CSVs plus a _README of honest refusals — no MATLAB needed.
 */
export const matToZipEngine: Engine = {
	id: "extract:mat-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertMatToZip(input, onProgress);
	},
};
