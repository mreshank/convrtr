import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertWalToPng } from "./parser";
import type { WalConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Quake II Texture (.wal) conversion engine.
 * Decodes id Tech 2 / Quake II mipmapped surface textures into 32-bit RGBA PNG graphics.
 */
export const walToPngEngine: Engine = {
	id: "extract:wal-to-png",

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

		const options: WalConversionOptions = {
			mipmapLevel,
		};

		const result = convertWalToPng(input, options, onProgress);
		return result.pngBuffer;
	},
};
