import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "./registry";
import type { ImageDecoder, ImageEncoder } from "./types";

/**
 * Composes one `ImageDecoder` and one `ImageEncoder` into a full `Engine`,
 * so `core/pipeline` needs no change: it only ever sees the `Engine`
 * contract, never the decoder/encoder split underneath it.
 *
 * The `decoders`/`encoders` parameters default to the shared singleton
 * registries; tests pass stub maps instead so `probe()` behaviour can be
 * exercised without loading real WASM.
 */
export function createImagePipelineEngine(
	decoderId: string,
	encoderId: string,
	decoders: Map<string, ImageDecoder> = IMAGE_DECODERS,
	encoders: Map<string, ImageEncoder> = IMAGE_ENCODERS,
): Engine {
	const id = `image:${decoderId}->${encoderId}`;

	function resolve():
		| { decoder: ImageDecoder; encoder: ImageEncoder }
		| undefined {
		const decoder = decoders.get(decoderId);
		const encoder = encoders.get(encoderId);
		if (!decoder || !encoder) return undefined;
		return { decoder, encoder };
	}

	return {
		id,

		async probe() {
			const pair = resolve();
			if (!pair) return false;
			const [decoderOk, encoderOk] = await Promise.all([
				pair.decoder.probe(),
				pair.encoder.probe(),
			]);
			return decoderOk && encoderOk;
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
		) {
			const pair = resolve();
			if (!pair) {
				throw new Error(
					`image pipeline engine "${id}" has no registered decoder/encoder pair`,
				);
			}

			onProgress(0.1, "DECODE");
			const image = await pair.decoder.decode(input);
			onProgress(0.5, "ENCODE");

			const encoded = await pair.encoder.encode(image, params);
			onProgress(1, "ENCODE");
			return encoded;
		},
	};
}
