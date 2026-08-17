import { describe, expect, it } from "vitest";
import { IMAGE_DECODERS, IMAGE_ENCODERS } from "@/core/engines/image/registry";
import { IMAGE_TOOLS } from "../tools/image";
import { ToolSchema } from "../types";

// These tests exercise the image tools declared under
// `src/core/registry/tools/**` directly, without going through
// `src/core/registry/index.ts` — that file is owned by another agent
// wiring these tools into the shared `TOOLS` array, and this suite must
// pass on its own regardless of when that wiring lands.

function getImageTool(id: string) {
	return IMAGE_TOOLS.find((t) => t.id === id);
}

describe("image tools conformance", () => {
	it("declares at least the fourteen requested conversions plus the migrated png-to-webp", () => {
		expect(IMAGE_TOOLS.length).toBeGreaterThanOrEqual(15);
	});

	it("validates every entry against the shared Tool schema", () => {
		for (const tool of IMAGE_TOOLS) {
			expect(() => ToolSchema.parse(tool)).not.toThrow();
		}
	});

	it("has no duplicate ids", () => {
		const ids = IMAGE_TOOLS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("derives a slug that matches the id suffix", () => {
		for (const tool of IMAGE_TOOLS) {
			expect(tool.id).toBe(`${tool.category}/${tool.slug}`);
		}
	});

	it("resolves every related tool id within this set", () => {
		for (const tool of IMAGE_TOOLS) {
			for (const related of tool.seo.related) {
				expect(getImageTool(related), `${tool.id} → ${related}`).toBeDefined();
			}
		}
	});

	it("keeps png-to-webp's id, slug, and engine id unchanged by the migration", () => {
		const tool = getImageTool("image/png-to-webp");
		expect(tool?.slug).toBe("png-to-webp");
		expect(tool?.engines).toEqual(["image:png->webp"]);
	});
});

describe("image tool engine ids", () => {
	const ENGINE_ID_PATTERN = /^image:([a-z]+)->([a-z]+)$/;

	it("matches the image:<decoder>-><encoder> pattern and references real registered ids", () => {
		for (const tool of IMAGE_TOOLS) {
			expect(tool.engines).toHaveLength(1);
			const [engineId] = tool.engines;
			const match = ENGINE_ID_PATTERN.exec(engineId ?? "");
			expect(match, `${tool.id} engine id "${engineId}"`).not.toBeNull();

			const decoderId = match?.[1];
			const encoderId = match?.[2];
			expect(
				decoderId !== undefined && IMAGE_DECODERS.has(decoderId),
				`${tool.id} references unknown decoder "${decoderId}"`,
			).toBe(true);
			expect(
				encoderId !== undefined && IMAGE_ENCODERS.has(encoderId),
				`${tool.id} references unknown encoder "${encoderId}"`,
			).toBe(true);
		}
	});
});

describe("image tool losslessAvailable truthfulness", () => {
	// The real capability of each *encoder*, independent of which tool uses
	// it — this is what `losslessAvailable` must agree with everywhere.
	// Justification for each value lives in
	// `src/core/registry/tools/image/quality-profiles.ts` and
	// `.superpowers/sdd/2026-08-07-spine-vertical-slice/w2-tools-report.md`:
	//
	// - jpeg: mozjpeg has no lossless mode at all.
	// - png:  DEFLATE + oxipng's own lossless recompression; always exact.
	// - webp: `@jsquash/webp` genuinely forwards `lossless: 1/0`.
	// - avif: the encoder's `lossless` flag is real, but AVIF lossless output
	//         is impractical (often larger than a lossy encode or the
	//         source) and this tool never sets it — not exposed, so false.
	// - jxl:  `@jsquash/jxl` 1.3.0's `lossless: true` is forwarded to the
	//         wasm module but verified (by round-tripping encode/decode on
	//         synthetic RGBA fixtures) to NOT be bit-exact — false.
	const EXPECTED_LOSSLESS_AVAILABLE: Record<string, boolean> = {
		jpeg: false,
		png: true,
		webp: true,
		avif: false,
		jxl: false,
	};

	it("matches each tool's real encoder capability", () => {
		for (const tool of IMAGE_TOOLS) {
			const [engineId] = tool.engines;
			const encoderId = engineId?.split("->")[1];
			expect(
				encoderId !== undefined && encoderId in EXPECTED_LOSSLESS_AVAILABLE,
				`${tool.id} has no expectation table entry for encoder "${encoderId}"`,
			).toBe(true);
			const expected =
				encoderId !== undefined
					? EXPECTED_LOSSLESS_AVAILABLE[encoderId]
					: undefined;
			expect(
				tool.quality.losslessAvailable,
				`${tool.id} (encoder "${encoderId}")`,
			).toBe(expected);
		}
	});

	it("never sets losslessAvailable: true without a lossless preset actually offered", () => {
		for (const tool of IMAGE_TOOLS) {
			if (!tool.quality.losslessAvailable) continue;
			expect(
				tool.quality.presets.some((p) => p.id === "lossless"),
				`${tool.id} claims losslessAvailable but offers no "lossless" preset`,
			).toBe(true);
		}
	});
});
