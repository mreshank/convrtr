import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractIcnsToPng } from "./parser";

/**
 * Extracts the highest-resolution retina PNG icon from Apple macOS .icns archives.
 */
export const icnsToPngEngine: Engine = {
	id: "extract:icns-to-png",

	async probe() {
		return true; // Pure client-side binary chunk parser and PNG slicer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return extractIcnsToPng(input, onProgress);
	},
};
