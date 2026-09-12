import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertS3mToWav } from "./parser";
import type { S3mConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Scream Tracker 3 (.s3m) to 16-bit stereo WAV synthesis engine.
 */
export const s3mToWavEngine: Engine = {
	id: "extract:s3m-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const sampleRate =
			typeof params.sampleRate === "number"
				? params.sampleRate
				: typeof params.sampleRate === "string"
					? parseInt(params.sampleRate, 10)
					: 44100;

		const panningSeparation =
			typeof params.panningSeparation === "number"
				? params.panningSeparation
				: typeof params.panningSeparation === "string"
					? parseFloat(params.panningSeparation)
					: 0.7;

		const options: S3mConversionOptions = {
			sampleRate,
			panningSeparation,
		};

		const result = convertS3mToWav(input, options, onProgress);
		return result.wavBytes.buffer as ArrayBuffer;
	},
};
