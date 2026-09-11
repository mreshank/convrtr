import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractProcreatePreview, extractProcreateTimelapse } from "./parser";

/**
 * Extracts the raw H.264/AAC MP4 timelapse video directly from a Procreate package.
 * There is zero transcoding — the video emerges bit-identical to how iPad hardware encoded it.
 */
export const procreateToMp4Engine: Engine = {
	id: "extract:procreate-to-mp4",

	async probe() {
		return true; // Pure JS zip extraction, works in all environments
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "UNPACK");
		const output = extractProcreateTimelapse(input);
		onProgress(1, "DONE");
		return output;
	},
};

/**
 * Extracts the full-resolution composite artwork PNG from a Procreate package.
 */
export const procreateToPngEngine: Engine = {
	id: "extract:procreate-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "UNPACK");
		const output = extractProcreatePreview(input);
		onProgress(1, "DONE");
		return output;
	},
};
