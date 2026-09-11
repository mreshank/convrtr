import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAseToCss } from "./parser";

/**
 * Adobe Swatch Exchange (.ase) palette extractor engine.
 * Decodes binary ASE swatch books (RGB, CMYK, Lab, Grayscale) from Photoshop, Illustrator, and InDesign
 * into production-ready CSS variables and Tailwind CSS palette tokens.
 */
export const aseToCssEngine: Engine = {
	id: "extract:ase-to-css",

	async probe() {
		return true; // Pure client-side binary ASE parser and CSS generator
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAseToCss(input, onProgress);
	},
};
