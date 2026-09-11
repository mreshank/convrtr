import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractPkgVideo } from "./parser";

/**
 * Extracts raw MP4 video wallpapers from Wallpaper Engine (.pkg) packages.
 */
export const pkgToMp4Engine: Engine = {
	id: "extract:pkg-to-mp4",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "UNPACK");
		const output = extractPkgVideo(input);
		onProgress(1, "DONE");
		return output;
	},
};
