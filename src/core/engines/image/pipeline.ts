import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "./registry";
import { IMAGE_TRANSFORMS } from "./transforms/registry";
import type { ImageDecoder, ImageEncoder, ImageTransform } from "./types";

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
	options: {
		/**
		 * Transform ids applied in order between decode and encode. Omitted for
		 * a straight format conversion, which is the common case.
		 */
		transforms?: string[];
		decoders?: Map<string, ImageDecoder>;
		encoders?: Map<string, ImageEncoder>;
		transformRegistry?: Map<string, ImageTransform>;
	} = {},
): Engine {
	const decoders = options.decoders ?? IMAGE_DECODERS;
	const encoders = options.encoders ?? IMAGE_ENCODERS;
	const transformRegistry = options.transformRegistry ?? IMAGE_TRANSFORMS;
	const transformIds = options.transforms ?? [];

	// The transform chain is part of the identity: `image:png->jpeg` and
	// `image:png-[resize]->jpeg` are different engines producing different
	// output, so a tool must be able to name exactly the one it wants.
	const chain = transformIds.length > 0 ? `-[${transformIds.join(",")}]` : "";
	const id = `image:${decoderId}${chain}->${encoderId}`;

	function resolve():
		| {
				decoder: ImageDecoder;
				encoder: ImageEncoder;
				transforms: ImageTransform[];
		  }
		| undefined {
		const decoder = decoders.get(decoderId);
		const encoder = encoders.get(encoderId);
		if (!decoder || !encoder) return undefined;

		const transforms: ImageTransform[] = [];
		for (const transformId of transformIds) {
			const transform = transformRegistry.get(transformId);
			// An unknown transform must fail the whole engine rather than being
			// skipped: silently dropping a resize would hand the user a
			// full-size image while reporting success.
			if (!transform) return undefined;
			transforms.push(transform);
		}
		return { decoder, encoder, transforms };
	}

	return {
		id,

		async probe() {
			const pair = resolve();
			if (!pair) return false;
			const results = await Promise.all([
				pair.decoder.probe(),
				pair.encoder.probe(),
				...pair.transforms.map((transform) => transform.probe()),
			]);
			return results.every(Boolean);
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
			let image = await pair.decoder.decode(input);

			// Transforms share the 0.4-0.6 band so progress stays monotonic
			// whether there are none, one, or several.
			for (const [index, transform] of pair.transforms.entries()) {
				onProgress(0.4 + (0.2 * index) / pair.transforms.length, "TRANSFORM");
				image = await transform.apply(image, params);
			}

			onProgress(0.6, "ENCODE");
			const encoded = await pair.encoder.encode(image, params);
			onProgress(1, "ENCODE");
			return encoded;
		},
	};
}
