import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertHdrToPng } from "./parser";
import type { HdrConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Radiance HDR (.hdr / .pic) floating-point RGBE image to 32-bit RGBA PNG engine.
 */
export const hdrToPngEngine: Engine = {
	id: "extract:hdr-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const exposure =
			typeof params.exposure === "number"
				? params.exposure
				: Number.parseFloat(String(params.exposure ?? "1.0"));

		const gamma =
			typeof params.gamma === "number"
				? params.gamma
				: Number.parseFloat(String(params.gamma ?? "2.2"));

		const options: HdrConversionOptions = {
			exposure: Number.isNaN(exposure) || exposure <= 0 ? 1.0 : exposure,
			gamma: Number.isNaN(gamma) || gamma <= 0 ? 2.2 : gamma,
		};

		const result = convertHdrToPng(input, options, onProgress);
		return result.pngBytes.buffer as ArrayBuffer;
	},
};
