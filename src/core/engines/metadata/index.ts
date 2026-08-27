import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { stripJpegMetadata } from "./jpeg";
import { stripPngMetadata } from "./png";

type Stripper = (input: ArrayBuffer) => ArrayBuffer;

/**
 * Wraps a byte-level metadata stripper as an `Engine`, so `core/pipeline` and
 * the UI treat it exactly like any conversion.
 *
 * These engines never decode. That is the whole point: rewriting the file's
 * segment or chunk structure removes metadata while leaving the compressed
 * image data bit-identical, whereas decoding and re-encoding a JPEG would
 * cost the user real image quality to remove a GPS tag.
 */
function createStripEngine(format: string, strip: Stripper): Engine {
	return {
		id: `metadata:strip-${format}`,

		async probe() {
			// Pure byte manipulation — no WASM, no platform APIs, always available.
			return true;
		},

		async run(
			input: ArrayBuffer,
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
		) {
			onProgress(0.1, "SCAN");
			const output = strip(input);
			onProgress(1, "STRIP");
			return output;
		},
	};
}

export const METADATA_ENGINES: Engine[] = [
	createStripEngine("jpeg", stripJpegMetadata),
	createStripEngine("png", stripPngMetadata),
];

export { stripJpegMetadata, stripPngMetadata };
