import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertXwdToPng } from "./parser";

/**
 * XWD (X Window System Window Dump) to PNG conversion engine.
 * Decodes 1/8/16/24/32-bit X11 window dumps, pixmaps, and colormaps
 * into standard 32-bit RGBA PNGs client-side.
 */
export const xwdToPngEngine: Engine = {
	id: "extract:xwd-to-png",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		const out = await convertXwdToPng(input, onProgress);
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
