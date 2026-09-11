import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { extractScormToZip } from "./parser";

/**
 * Unpacks SCORM, Articulate Storyline, Rise 360, and Adobe Captivate course
 * packages, extracting and categorizing embedded videos, audio, images, and PDFs.
 */
export const scormToZipEngine: Engine = {
	id: "extract:scorm-to-zip",

	async probe() {
		return true; // Pure client-side zip unpacker and media filter
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return extractScormToZip(input, onProgress);
	},
};
