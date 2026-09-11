import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractStudio3ToSvg } from "./parser";

/**
 * Extracts vector cut shapes from Silhouette Studio (.studio / .studio3) project files
 * and converts them directly into standard SVG markup without requiring Silhouette Business Edition.
 */
export const studio3ToSvgEngine: Engine = {
	id: "extract:studio3-to-svg",

	async probe() {
		return true; // Pure client-side zip/XML parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "UNPACK");
		const svgString = extractStudio3ToSvg(input);
		onProgress(0.9, "RENDER");
		const outputBytes = new TextEncoder().encode(svgString);
		onProgress(1.0, "COMPLETE");
		return outputBytes.buffer;
	},
};
