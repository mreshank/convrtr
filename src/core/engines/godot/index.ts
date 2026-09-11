import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractPckToZip } from "./parser";

/**
 * Extracts and unpacks all scenes, scripts, textures, and sounds from a Godot Engine
 * package (.pck) into an organized standard ZIP archive.
 */
export const pckToZipEngine: Engine = {
	id: "extract:pck-to-zip",

	async probe() {
		return true; // Pure client-side binary parser and zipper
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return extractPckToZip(input, onProgress);
	},
};
