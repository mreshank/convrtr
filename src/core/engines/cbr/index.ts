import type { ParamValue } from "@/core/quality";
import {
	bindComicPages,
	type Cb7ExtractionResult,
	unpackSevenZip,
} from "../cb7/parser";
import type { Engine } from "../types";

export const MAX_CBR_BYTES = 500_000_000;

async function convertCbrToPdf(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<Cb7ExtractionResult> {
	const { seven, outDir, cleanup } = await unpackSevenZip(
		input,
		MAX_CBR_BYTES,
		".cbr",
		onProgress,
	);
	try {
		return await bindComicPages(seven, outDir, ".cbr", onProgress);
	} finally {
		cleanup();
	}
}

export * from "../cb7/parser";

/**
 * Comic Book RAR (`.cbr`) to PDF engine.
 * Same 7-Zip core as cb7 (RAR4 + RAR5 codecs included) and the same shared
 * bind pipeline — the long-blocked RAR direction, unlocked.
 */
export const cbrToPdfEngine: Engine = {
	id: "extract:cbr-to-pdf",

	async probe() {
		return true; // 7-Zip core loads on demand; placement decides, not support
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const result = await convertCbrToPdf(input, onProgress);
		const buf = result.pdfBytes.buffer.slice(
			result.pdfBytes.byteOffset,
			result.pdfBytes.byteOffset + result.pdfBytes.byteLength,
		);
		return buf as ArrayBuffer;
	},
};
