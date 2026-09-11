import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertSrtToVtt } from "./parser";

export * from "./parser";
export * from "./types";

export const srtToVttEngine: Engine = {
	id: "extract:srt-to-vtt",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.1, "Reading SubRip cues");
		const result = convertSrtToVtt(input);
		onProgress(0.8, "Serializing WebVTT text");
		const out = new TextEncoder().encode(result.vttText);
		onProgress(1.0, "Conversion complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
