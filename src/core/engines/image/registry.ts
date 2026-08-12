import { avifDecoder } from "./decoders/avif";
import { heicDecoder } from "./decoders/heic";
import { jpegDecoder } from "./decoders/jpeg";
import { jxlDecoder } from "./decoders/jxl";
import { pngDecoder } from "./decoders/png";
import { webpDecoder } from "./decoders/webp";
import { avifEncoder } from "./encoders/avif";
import { jpegEncoder } from "./encoders/jpeg";
import { jxlEncoder } from "./encoders/jxl";
import { pngEncoder } from "./encoders/png";
import { webpEncoder } from "./encoders/webp";
import type { ImageDecoder, ImageEncoder } from "./types";

export const IMAGE_DECODERS = new Map<string, ImageDecoder>([
	[pngDecoder.id, pngDecoder],
	[jpegDecoder.id, jpegDecoder],
	[avifDecoder.id, avifDecoder],
	[jxlDecoder.id, jxlDecoder],
	[webpDecoder.id, webpDecoder],
	[heicDecoder.id, heicDecoder],
]);

export const IMAGE_ENCODERS = new Map<string, ImageEncoder>([
	[webpEncoder.id, webpEncoder],
	[jpegEncoder.id, jpegEncoder],
	[pngEncoder.id, pngEncoder],
	[avifEncoder.id, avifEncoder],
	[jxlEncoder.id, jxlEncoder],
]);

export function getDecoderFor(
	mime: string,
	registry: Map<string, ImageDecoder> = IMAGE_DECODERS,
): ImageDecoder | undefined {
	for (const decoder of registry.values()) {
		if (decoder.mime.includes(mime)) return decoder;
	}
	return undefined;
}

export function getEncoder(
	id: string,
	registry: Map<string, ImageEncoder> = IMAGE_ENCODERS,
): ImageEncoder | undefined {
	return registry.get(id);
}
