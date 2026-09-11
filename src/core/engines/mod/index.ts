import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertModToWav } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * Amiga ProTracker / Ultimate SoundTracker (.mod) to WAV conversion engine.
 * Synthesizes 4/8-channel Amiga Paula chip tracker music, period effects,
 * and 8-bit signed PCM instrument samples into standard 16-bit 44.1kHz stereo WAV.
 */
export const modToWavEngine: Engine = {
	id: "extract:mod-to-wav",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.1, "Parsing ProTracker header and patterns");
		const result = convertModToWav(input);
		onProgress(0.8, "Synthesizing 16-bit stereo WAV");
		const out = result.wavBuffer;
		onProgress(1.0, "Conversion complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
