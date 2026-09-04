import { createAudioExtractionEngine } from "./audio/extract";
import { createFlacDecodeEngine, createFlacEncodeEngine } from "./audio/flac";
import { createMp3EncodeEngine } from "./audio/mp3";
import { createOpusEncodeEngine } from "./audio/opus";
import { createImagePipelineEngine } from "./image";
import { faviconPackEngine } from "./image/packs/favicon";
import { gifFramesEngine } from "./image/packs/gif-frames";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "./image/registry";
import { METADATA_ENGINES } from "./metadata";
import { mlwToMp4Engine } from "./mlw";
import { imageToPdfEngine } from "./pdf/image-to-pdf";
import { svgOptimiseEngine } from "./svg/optimise";
import type { Engine } from "./types";
import { createVideoConversionEngine } from "./video/convert";
import { createFrameExtractionEngine } from "./video/frame";
import { createGifEngine } from "./video/gif";
import { createLegacyConversionEngine } from "./video/legacy";
import { createVideoTrimEngine } from "./video/trim";

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

	// Container conversions. mediabunny copies encoded samples wherever the
	// target can carry them and only re-encodes when it cannot, so mkv->mp4 and
	// mov->mp4 are typically pure remuxes finishing in seconds.
	for (const [from, to] of [
		["mkv", "mp4"],
		["mov", "mp4"],
		["webm", "mp4"],
		["mp4", "webm"],
	] as const) {
		const engine = createVideoConversionEngine(to, from);
		engines.set(engine.id, engine);
	}

	// Opus. Lossy like MP3 but roughly half the bitrate for the same quality,
	// and encoded by the browser itself — no codec library ships for it.
	{
		const engine = createOpusEncodeEngine();
		engines.set(engine.id, engine);
	}

	// MP3. The most-asked-for audio conversion, and the one that cannot be
	// lossless — the tool says so, and points at FLAC for anyone who wanted
	// "smaller" rather than "smaller and lossy".
	{
		const engine = createMp3EncodeEngine();
		engines.set(engine.id, engine);
	}

	// FLAC. The audio pack's lossless pair: WAV in, roughly half the bytes out,
	// and the identical samples back again — proven by round-trip rather than
	// asserted.
	for (const engine of [createFlacEncodeEngine(), createFlacDecodeEngine()]) {
		engines.set(engine.id, engine);
	}

	// Audio extraction. The audio track is copied out untouched wherever the
	// target container can carry the codec, which for MP4's AAC into .m4a is
	// the common case — the operation almost every other converter answers
	// with a re-encode to MP3.
	// The ffmpeg.wasm tier, for containers no browser API can read. Registered
	// like any other engine, but its 31MB core is fetched only after the user
	// agrees — see `heavyDownloadMb` on the tools that use it.
	for (const from of ["avi", "flv", "wmv"] as const) {
		const engine = createLegacyConversionEngine(from, "mp4");
		engines.set(engine.id, engine);
	}

	// Video to animated GIF. The only video tool that cannot claim losslessness
	// — GIF holds 256 colours where the source holds millions — so the options
	// are about how that loss is spent rather than whether it happens.
	for (const container of ["mp4", "mkv", "webm"] as const) {
		const engine = createGifEngine(container);
		engines.set(engine.id, engine);
	}

	// Single-frame extraction. This one genuinely decodes — a still cannot be
	// made from a copied inter-frame packet — but only from the preceding
	// keyframe forward, not through the whole file.
	for (const container of ["mp4", "mkv", "webm"] as const) {
		const engine = createFrameExtractionEngine(container);
		engines.set(engine.id, engine);
	}

	// Trimming. Not a `Conversion` with a trim option — that re-encodes, since
	// its copy path requires starting at the file's first timestamp. These copy
	// packets directly, so a cut costs nothing in quality.
	for (const container of ["mp4", "mkv", "webm"] as const) {
		const engine = createVideoTrimEngine(container);
		engines.set(engine.id, engine);
	}

	for (const [from, to] of [
		["mp4", "m4a"],
		["mkv", "m4a"],
		["mov", "m4a"],
		["webm", "ogg"],
	] as const) {
		const engine = createAudioExtractionEngine(from, to);
		engines.set(engine.id, engine);
	}

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
