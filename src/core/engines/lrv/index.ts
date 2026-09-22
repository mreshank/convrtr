import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * GoPro .lrv proxy → MP4. An LRV (Low Resolution Video) stream is a full MP4
 * container (ISOBMFF, starts with an ftyp box) that GoPro names .lrv purely
 * so the camera app and quick-view tools can tell it apart from the 4K
 * original. The bytes are already a valid MP4 — this engine verifies that
 * fact and hands them through without re-encoding.
 */
export const lrvToMp4Engine: Engine = {
	id: "video:lrv->mp4",

	async probe() {
		return true; // Pure byte verification — no codecs, no WASM.
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.1, "VERIFY");

		if (!isMp4Container(input)) {
			throw new Error(
				"Not an MP4 container: expected a GoPro .lrv proxy (isobmff box starting with ftyp).",
			);
		}

		onProgress(1, "DONE");
		return input;
	},
};

function isMp4Container(input: ArrayBuffer): boolean {
	if (input.byteLength < 12) return false;
	const view = new Uint8Array(input);
	return (
		view[4] === 0x66 && // f
		view[5] === 0x74 && // t
		view[6] === 0x79 && // y
		view[7] === 0x70 //   p
	);
}
