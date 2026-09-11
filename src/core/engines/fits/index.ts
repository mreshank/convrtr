import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertFitsToPng } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * FITS (Flexible Image Transport System) to PNG conversion engine.
 * Decodes 8/16/32/64-bit integer and 32/64-bit floating point astronomical images
 * from NASA, ESA, Hubble, and JWST into standard 32-bit RGBA PNG client-side.
 */
export const fitsToPngEngine: Engine = {
	id: "extract:fits-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.1, "Parsing FITS header blocks");
		const result = convertFitsToPng(input);
		onProgress(0.8, "Encoding lossless PNG");
		const out = result.pngBuffer;
		onProgress(1.0, "Conversion complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
