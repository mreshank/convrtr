import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convert669ToWav } from "./parser";
import type { SixSixNineConversionOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Composer 669 and UNIS 669 (.669) 8-channel tracker to 16-bit 44.1kHz stereo WAV audio engine.
 */
export const sixSixNineToWavEngine: Engine = {
	id: "extract:669-to-wav",

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
				: Number.parseInt(String(params.sampleRate ?? "44100"), 10);

		const options: SixSixNineConversionOptions = {
			sampleRate: Number.isNaN(sampleRate) || sampleRate <= 0 ? 44100 : sampleRate,
		};

		const result = convert669ToWav(input, options, onProgress);
		return result.wavBytes.buffer as ArrayBuffer;
	},
};
