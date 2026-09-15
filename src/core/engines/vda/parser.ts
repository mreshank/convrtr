import { parseTga } from "../tga/parser";
import type {
	VdaConversionOptions,
	VdaConversionResult,
	VdaMetadata,
} from "./types";

/**
 * Converts Truevision TARGA variants (.vda, .icb, .vst) into transparent 32-bit RGBA PNG.
 */
export function convertVdaToPng(
	input: ArrayBuffer | Uint8Array,
	_options: VdaConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): VdaConversionResult {
	onProgress?.(0.1, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 18) {
		throw new Error(
			"Invalid VDA image: Buffer too small for Truevision header.",
		);
	}

	onProgress?.(0.4, "DECODE_PIXELS");
	const parsed = parseTga(bytes);

	onProgress?.(0.9, "ENCODE_PNG");
	const pngBuffer = parsed.pngBytes.buffer.slice(
		parsed.pngBytes.byteOffset,
		parsed.pngBytes.byteOffset + parsed.pngBytes.byteLength,
	) as ArrayBuffer;

	const metadata: VdaMetadata = {
		width: parsed.width,
		height: parsed.height,
		pixelDepth: parsed.pixelDepth,
		imageType: parsed.imageType,
		imageTypeName: parsed.imageTypeName,
		hasAlpha: parsed.hasAlpha,
		isRle: parsed.isRle,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		pngBuffer,
		metadata,
	};
}
