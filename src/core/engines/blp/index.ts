import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertBlpToPng } from "./parser";
import type { BlpConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Blizzard Texture (.blp) conversion engine.
 * Decodes Warcraft III (BLP1) and World of Warcraft (BLP2) indexed,
 * raw BGRA, and DXT compressed textures into 32-bit transparent RGBA PNG.
 */
export const blpToPngEngine: Engine = {
	id: "extract:blp-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const mipmapLevel =
			typeof params.mipmapLevel === "number"
				? params.mipmapLevel
				: Number.parseInt(String(params.mipmapLevel ?? "0"), 10) || 0;

		const options: BlpConversionOptions = {
			mipmapLevel,
		};

		const result = convertBlpToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
