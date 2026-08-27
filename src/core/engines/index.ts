import { createImagePipelineEngine } from "./image";
import { faviconPackEngine } from "./image/packs/favicon";
import { gifFramesEngine } from "./image/packs/gif-frames";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "./image/registry";
import { METADATA_ENGINES } from "./metadata";
import { mlwToMp4Engine } from "./mlw";
import { imageToPdfEngine } from "./pdf/image-to-pdf";
import { svgOptimiseEngine } from "./svg/optimise";
import type { Engine } from "./types";

export * from "./image";
export * from "./types";

/**
 * Every decoder pairs with every encoder, so the full cross product is
 * registered rather than a hand-written list of the pairs we happen to expose
 * as tools today.
 *
 * This is where the decoder/encoder decomposition pays off: adding one decoder
 * enables conversion from that format to every output we support, and adding
 * one encoder enables it from every input — with no wiring here at all. The
 * alternative, one bespoke engine per pair, would grow multiplicatively and
 * would need editing on every codec addition.
 *
 * Same-format pairs (e.g. `image:png->png`) are included deliberately: they are
 * the re-encode/optimise path, which for PNG means lossless oxipng compression.
 */
function buildImageEngines(): Map<string, Engine> {
	const engines = new Map<string, Engine>();
	for (const decoder of IMAGE_DECODERS.values()) {
		for (const encoder of IMAGE_ENCODERS.values()) {
			const engine = createImagePipelineEngine(decoder.id, encoder.id);
			engines.set(engine.id, engine);
		}
	}

	// Same-format resize variants. Registered only where a format can be both
	// read and written, since a resize writes the image back in the format it
	// arrived in. The resize transform early-returns before touching WASM when
	// no dimensions are set, so these cost nothing when a caller does not ask
	// for a resize.
	for (const decoder of IMAGE_DECODERS.values()) {
		if (!IMAGE_ENCODERS.has(decoder.id)) continue;
		const engine = createImagePipelineEngine(decoder.id, decoder.id, {
			transforms: ["resize"],
		});
		engines.set(engine.id, engine);
	}

	// Byte-level metadata strippers. Not image pipelines: they never decode,
	// which is what lets them remove EXIF without recompressing the photo.
	for (const engine of METADATA_ENGINES) {
		engines.set(engine.id, engine);
	}

	// One-to-many: emits a ZIP so the pipeline, batch runner and save path
	// need no special case for a tool that produces several files.
	engines.set(faviconPackEngine.id, faviconPackEngine);

	// Uses the platform GIF decoder, so it is unavailable in Firefox — probe()
	// feature-detects and the engine simply is not selected there.
	engines.set(gifFramesEngine.id, gifFramesEngine);

	// Embeds the image stream directly; never rasterises, so the picture inside
	// the PDF is byte-identical to the input.
	engines.set(imageToPdfEngine.id, imageToPdfEngine);

	// Text in, text out — SVGO on the SVG source, no raster step at all.
	engines.set(svgOptimiseEngine.id, svgOptimiseEngine);

	// Format-specific extractors: byte-offset parsing plus Web Crypto, no
	// decode/encode pipeline at all.
	engines.set(mlwToMp4Engine.id, mlwToMp4Engine);

	return engines;
}

export const ENGINES: Map<string, Engine> = buildImageEngines();

export function getEngine(id: string): Engine | undefined {
	return ENGINES.get(id);
}

export async function selectEngine(
	ids: string[],
	registry: Map<string, Engine> = ENGINES,
): Promise<Engine | undefined> {
	for (const id of ids) {
		const engine = registry.get(id);
		if (engine && (await engine.probe())) return engine;
	}
	return undefined;
}
