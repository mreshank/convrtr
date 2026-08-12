import type { ParamValue } from "@/core/quality";
import type { Engine } from "./types";

export const jsquashPngToWebp: Engine = {
	id: "jsquash-png-to-webp",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const { default: decodePng } = await import("@jsquash/png/decode");
		const { default: encodeWebp } = await import("@jsquash/webp/encode");

		onProgress(0.1, "DECODE");
		const imageData = await decodePng(input);
		onProgress(0.5, "ENCODE");

		const encoded = await encodeWebp(imageData, {
			lossless: Number(params.lossless ?? 0),
			quality: Number(params.quality ?? 92),
			method: Number(params.method ?? 4),
			near_lossless: Number(params.near_lossless ?? 100),
			alpha_quality: Number(params.alpha_quality ?? 100),
			filter_strength: Number(params.filter_strength ?? 60),
			segments: Number(params.segments ?? 4),
			sns_strength: Number(params.sns_strength ?? 50),
		});

		onProgress(1, "ENCODE");
		return encoded;
	},
};
