import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertDcmToPng } from "./parser";
import type { DcmToPngOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Digital Imaging and Communications in Medicine (DICOM) .dcm image conversion engine.
 * Decodes medical radiology imaging (CT, MRI, X-ray, Ultrasound) with Window/Level contrast curves into lossless PNG.
 */
export const dcmToPngEngine: Engine = {
	id: "extract:dcm-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const windowCenter =
			typeof params.windowCenter === "number"
				? params.windowCenter
				: Number.parseFloat(String(params.windowCenter ?? "")) || undefined;

		const windowWidth =
			typeof params.windowWidth === "number"
				? params.windowWidth
				: Number.parseFloat(String(params.windowWidth ?? "")) || undefined;

		const invert = params.invert === true || params.invert === "true";

		const options: DcmToPngOptions = {
			windowCenter,
			windowWidth,
			invert,
		};

		const result = convertDcmToPng(input, options, onProgress);
		return result.pngBytes.slice().buffer as ArrayBuffer;
	},
};
