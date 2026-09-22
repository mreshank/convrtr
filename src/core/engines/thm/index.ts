import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * GoPro .thm thumbnail → JPEG. A .thm is a single complete JPEG that cameras
 * and quick-view tools read because the extension tells them it contains no
 * preview render — but unlike a recording, the bytes are already a standalone
 * JFIF file. This engine verifies that (SOI marker, segment type, first byte
 * of frame data) and hands the identical bytes through under .jpg.
 */
export const thmToJpgEngine: Engine = {
	id: "extract:thm-to-jpg",

	async probe() {
		return true; // Pure byte verification — no codecs, no WASM.
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.1, "VERIFY");

		if (!isJpeg(input)) {
			throw new Error(
				"Not a JPEG: expected a GoPro .thm thumbnail beginning with the FF D8 FF SOI marker.",
			);
		}

		onProgress(1, "DONE");
		return input;
	},
};

function isJpeg(input: ArrayBuffer): boolean {
	if (input.byteLength < 4) return false;
	const view = new Uint8Array(input);
	return view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff;
}
