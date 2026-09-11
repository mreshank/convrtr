import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertVttToSrt } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * WebVTT (.vtt) to SubRip (.srt) subtitle conversion engine.
 * Converts W3C HTML5 video captions, zoom transcripts, and podcast cues
 * into universally compatible standard SubRip (.srt) subtitles client-side.
 */
export const vttToSrtEngine: Engine = {
	id: "extract:vtt-to-srt",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.1, "Reading WebVTT cues");
		const result = convertVttToSrt(input);
		onProgress(0.8, "Serializing SubRip SRT text");
		const out = new TextEncoder().encode(result.srtText);
		onProgress(1.0, "Conversion complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
