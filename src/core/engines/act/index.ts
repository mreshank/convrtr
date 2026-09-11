import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertActToCss } from "./parser";

/**
 * Adobe Photoshop Color Table (.act) to CSS palette converter engine.
 * Converts 256-color indexed palettes into semantic CSS custom properties (:root),
 * Tailwind color configuration snippets, and utility swatch styles.
 */
export const actToCssEngine: Engine = {
	id: "extract:act-to-css",

	async probe() {
		return true; // Pure client-side binary parser
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertActToCss(input, onProgress);
	},
};
