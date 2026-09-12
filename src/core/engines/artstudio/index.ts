import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertArtStudioToPng } from "./parser";
import type {
	ArtStudioMode,
	ArtStudioPalette,
	ArtStudioToPngOptions,
} from "./types";

export * from "./parser";
export * from "./types";

/**
 * Commodore 64 Advanced Art Studio (.art) image conversion engine.
 * Decodes Hires and Multicolor bitmap graphics into 32-bit RGBA PNG.
 */
export const artStudioToPngEngine: Engine = {
	id: "extract:art-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const scale =
			typeof params.scale === "number"
				? params.scale
				: Number.parseInt(String(params.scale ?? "1"), 10) || 1;

		const palette: ArtStudioPalette =
			params.palette === "colodore" ? "colodore" : "pepto";

		let mode: ArtStudioMode = "auto";
		if (params.mode === "hires" || params.mode === "multicolor") {
			mode = params.mode;
		}

		const options: ArtStudioToPngOptions = { scale, palette, mode };

		const result = convertArtStudioToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
