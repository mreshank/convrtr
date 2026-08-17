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
describe("registry/engine MIME parity", () => {
	it("declares the same input MIME types the decoders advertise", () => {
		for (const tool of TOOLS) {
			const decoderId = tool.engines[0]?.split(":")[1]?.split("->")[0];
			expect(decoderId, `${tool.id} has a parseable engine id`).toBeDefined();
			if (!decoderId) continue;

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
			const encoderId = tool.engines[0]?.split("->")[1];
			expect(encoderId, `${tool.id} has a parseable engine id`).toBeDefined();
			if (!encoderId) continue;

			const encoder = IMAGE_ENCODERS.get(encoderId);
			expect(
				encoder,
				`${tool.id} references encoder "${encoderId}"`,
			).toBeDefined();
			expect(tool.output.mime, tool.id).toBe(encoder?.mime);
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
