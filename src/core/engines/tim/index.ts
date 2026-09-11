import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertTimToPng } from "./parser";
import type { TimToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Sony PlayStation 1 (.tim) game texture & sprite conversion engine.
 * Unpacks 4-bit/8-bit CLUT paletted textures and 15-bit/24-bit direct color
 * framebuffers into clean lossless 32-bit RGBA PNG images.
 */
export const timToPngEngine: Engine = {
	id: "extract:tim-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const rawPal = Number(params.paletteIndex);
		const paletteIndex =
			Number.isFinite(rawPal) && rawPal >= 0 ? rawPal : undefined;
		const enableTransparency = params.enableTransparency !== false;

		const options: TimToPngOptions = {
			paletteIndex,
			enableTransparency,
		};

		const result = convertTimToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
