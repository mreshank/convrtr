import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "@/core/engines/image/registry";
import { TOOLS } from "@/core/registry";

/**
 * The registry declares MIME types locally instead of reading them from the
 * engine layer, because `core/registry` is pure data and must not import an
 * engine (spec §5.1) — doing so dragged every codec module and its dynamic
 * WASM imports into each tool page's build graph and hung `next build`.
 *
 * Duplication without a guard drifts, so these tests hold the invariant the
 * runtime dependency used to. A test file can import both sides freely: it is
 * never part of the app bundle.
 */
/**
 * Engine ids are `image:<decoder>-><encoder>`, or
 * `image:<decoder>-[<transform>,...]-><encoder>` once a transform chain is
 * involved. Splitting naively would read the decoder of a resize engine as
 * "png-[resize]", so the chain is stripped here.
 */
function parseEngineId(
	engineId: string | undefined,
): { decoder: string; encoder: string } | undefined {
	if (!engineId) return undefined;
	const match = engineId.match(
		/^image:([a-z0-9]+)(?:-\[[^\]]*\])?->([a-z0-9]+)$/,
	);
	const decoder = match?.[1];
	const encoder = match?.[2];
	if (!decoder || !encoder) return undefined;
	return { decoder, encoder };
}

/**
 * Not every engine is an image pipeline. Metadata strippers
 * (`metadata:strip-jpeg`) work on file bytes and have no decoder or encoder,
 * so MIME parity does not apply to them — but a *malformed* image id must not
 * be waved through as "probably a metadata engine", so anything that is
 * neither shape is a failure.
 */
function isRecognisedEngineId(engineId: string | undefined): boolean {
	if (!engineId) return false;
	return (
		parseEngineId(engineId) !== undefined ||
		/^metadata:strip-[a-z]+$/.test(engineId) ||
		// One-to-many pack engines emit a ZIP and have no single
		// decoder/encoder pair, so MIME parity does not apply to them either.
		/^image:[a-z-]+-pack$/.test(engineId) ||
		// PDF engines embed an image stream rather than decoding it, so they
		// have no decoder/encoder pair either.
		/^pdf:[a-z-]+$/.test(engineId) ||
		// SVG optimisation is text-in/text-out with no raster stage, so it has
		// no decoder/encoder pair either.
		/^svg:[a-z-]+$/.test(engineId) ||
		// Format-specific extractors parse a proprietary container by byte
		// offset; there is no decoder/encoder pair to check parity against.
		/^extract:[a-z0-9-]+$/.test(engineId) ||
		// Container conversions demux and mux whole streams; there is no
		// image decoder/encoder pair to check parity against.
		/^video:[a-z0-9]+->[a-z0-9]+$/.test(engineId) ||
		// Audio extraction demuxes a video container and muxes one audio
		// stream, so it has no image decoder/encoder pair either.
		/^audio:[a-z0-9]+->[a-z0-9]+$/.test(engineId)
	);
}

describe("registry/engine MIME parity", () => {
	it("gives every tool a recognisable engine id", () => {
		for (const tool of TOOLS) {
			for (const engineId of tool.engines) {
				expect(
					isRecognisedEngineId(engineId),
					`${tool.id} -> ${engineId}`,
				).toBe(true);
			}
		}
	});

	it("declares the same input MIME types the decoders advertise", () => {
		for (const tool of TOOLS) {
			const parsed = parseEngineId(tool.engines[0]);
			// Metadata strippers have no decoder; covered by the test above.
			if (!parsed) continue;
			const decoderId = parsed.decoder;

			const decoder = IMAGE_DECODERS.get(decoderId);
			expect(
				decoder,
				`${tool.id} references decoder "${decoderId}"`,
			).toBeDefined();
			expect([...tool.accept.mime].sort(), tool.id).toEqual(
				[...(decoder?.mime ?? [])].sort(),
			);
		}
	});

	it("declares the same output MIME type the encoders advertise", () => {
		for (const tool of TOOLS) {
			const parsed = parseEngineId(tool.engines[0]);
			if (!parsed) continue;
			const encoderId = parsed.encoder;

			const encoder = IMAGE_ENCODERS.get(encoderId);
			expect(
				encoder,
				`${tool.id} references encoder "${encoderId}"`,
			).toBeDefined();
			expect(tool.output.mime, tool.id).toBe(encoder?.mime);
		}
	});
});

describe("engine id references", () => {
	it("names an engine that is actually registered", async () => {
		// A tool naming an unregistered engine builds and deploys fine, then
		// fails at runtime the first time a user clicks CONVERT. Catching it
		// here is the difference between a red test and a broken page.
		const { ENGINES } = await import("@/core/engines");
		for (const tool of TOOLS) {
			for (const engineId of tool.engines) {
				expect(ENGINES.has(engineId), `${tool.id} -> ${engineId}`).toBe(true);
			}
		}
	});
});

describe("module boundary", () => {
	it("keeps the registry free of runtime imports from the engine layer", () => {
		// Guards the regression directly: a type-only import is fine (erased at
		// build time), but a value import re-creates the build hang. Checking the
		// source text is crude, but it is the only thing that fails at the moment
		// the boundary is crossed rather than minutes later inside a stuck build.
		const source = readFileSync(
			"src/core/registry/tools/image/defineImageConversion.ts",
			"utf8",
		);
		const engineImports = [
			...source.matchAll(/^import\s+(.*?)from\s+["'](.*?)["']/gm),
		]
			.filter(([, , specifier]) => specifier?.includes("core/engines"))
			.filter(([, clause]) => !clause?.startsWith("type "));

		expect(
			engineImports.map(([line]) => line),
			"registry must not import engine values at runtime",
		).toEqual([]);
	});
});
