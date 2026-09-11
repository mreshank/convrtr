import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseAco } from "./parser";
import type { AcoToCssOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Adobe Photoshop Color Palette (.aco) conversion engine.
 * Parses binary color swatch tables (v1 and v2) with UTF-16 swatch names and
 * outputs clean CSS custom properties, Tailwind CSS configuration, or design token JSON.
 */
export const acoToCssEngine: Engine = {
	id: "extract:aco-to-css",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress?.(0.2, "PARSING_ACO");
		const format =
			params.format === "tailwind"
				? "tailwind"
				: params.format === "json"
					? "json"
					: "css";
		const options: AcoToCssOptions = { format };

		const result = parseAco(input, options);
		onProgress?.(1.0, "COMPLETE");

		return new TextEncoder().encode(result.cssText).buffer as ArrayBuffer;
	},
};
