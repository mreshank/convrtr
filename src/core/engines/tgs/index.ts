import { gunzipSync } from "fflate";
import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Decompresses Telegram animated stickers (.tgs) back to plain Lottie JSON.
 *
 * A .tgs file is a standard GZIP-compressed JSON stream conforming to the
 * Lottie / Bodymovin animation format.
 */
export const tgsToJsonEngine: Engine = {
	id: "extract:tgs-to-json",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.2, "DECOMPRESS");

		let decompressed: Uint8Array;
		try {
			decompressed = gunzipSync(new Uint8Array(input));
		} catch (err) {
			throw new Error(
				`tgsToJsonEngine: Not a valid GZIP / .tgs file (${err instanceof Error ? err.message : String(err)})`,
			);
		}

		onProgress(0.7, "VERIFY");
		// Verify that the decompressed data is valid JSON
		const text = new TextDecoder().decode(decompressed);
		try {
			JSON.parse(text);
		} catch (err) {
			throw new Error(
				`tgsToJsonEngine: Decompressed payload is not valid Lottie JSON (${err instanceof Error ? err.message : String(err)})`,
			);
		}

		onProgress(1, "DONE");
		return decompressed.buffer.slice(
			decompressed.byteOffset,
			decompressed.byteOffset + decompressed.byteLength,
		) as ArrayBuffer;
	},
};
