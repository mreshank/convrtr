import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertAniToZip } from "./parser";

/**
 * Windows Animated Cursor (.ani) extractor engine.
 * Unpacks RIFF ACON containers and extracts all animation frames as PNG images into a ZIP archive.
 */
export const aniToPngEngine: Engine = {
	id: "extract:ani-to-png",

	async probe() {
		return true; // Pure client-side RIFF parser, DIB/ICO frame decoder, and ZIP packer
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertAniToZip(input, onProgress);
	},
};
