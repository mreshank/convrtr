import { pngDecoder } from "./decoders/png";
import { webpEncoder } from "./encoders/webp";
import type { ImageDecoder, ImageEncoder } from "./types";

export const IMAGE_DECODERS = new Map<string, ImageDecoder>([
	[pngDecoder.id, pngDecoder],
]);

export const IMAGE_ENCODERS = new Map<string, ImageEncoder>([
	[webpEncoder.id, webpEncoder],
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
