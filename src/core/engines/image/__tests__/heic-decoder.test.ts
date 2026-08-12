import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { heicDecoder } from "../decoders/heic";

// `C020.heic` is a genuine sample from the Nokia/MPEG HEIF conformance suite
// (nokiatech/heif_conformance, Apache-2.0), chosen deliberately over a
// synthetic single-image stub: it has THREE top-level image IDs (1002, 1005,
// 1006 — confirmed via `heif_js_context_get_list_of_top_level_image_IDs`
// while building this test), which is exactly the "burst/live-photo, is the
// primary really first?" shape `heic.ts`'s decoder has to get right.
const fixturesDir = dirname(fileURLToPath(import.meta.url));
const fileBuffer = readFileSync(join(fixturesDir, "fixtures/C020.heic"));
const input = fileBuffer.buffer.slice(
	fileBuffer.byteOffset,
	fileBuffer.byteOffset + fileBuffer.byteLength,
);

// `libheif-js`'s default build compiles to asm.js, not WebAssembly (see the
// `probe()` comment in `../decoders/heic.ts`), so — unlike every other codec
// here — there is no `file://`-fetch problem to work around and no manual
// WASM init needed: this is a genuine, unmodified production code path
// running end to end under Node.
describe("heic decoder", () => {
	it("decodes the primary image to non-trivial, fully-opaque RGBA", async () => {
		const image = await heicDecoder.decode(input.slice(0));

		expect(image.width).toBeGreaterThan(0);
		expect(image.height).toBeGreaterThan(0);
		expect(image.data.length).toBe(image.width * image.height * 4);
		expect(image.colorSpace).toBe("srgb");

		// A real decode, not a stub: every pixel is fully opaque (HEIC has no
		// alpha in this fixture) and at least one non-black pixel exists.
		let sawColor = false;
		for (let i = 0; i < image.data.length; i += 4) {
			expect(image.data[i + 3]).toBe(255);
			const r = image.data[i];
			const g = image.data[i + 1];
			const b = image.data[i + 2];
			if (r !== undefined && g !== undefined && b !== undefined) {
				if (r !== 0 || g !== 0 || b !== 0) sawColor = true;
			}
		}
		expect(sawColor).toBe(true);
	}, 60000);

	it("resolves to the same dimensions on repeated decodes (deterministic primary-image selection)", async () => {
		const first = await heicDecoder.decode(input.slice(0));
		const second = await heicDecoder.decode(input.slice(0));
		expect(second.width).toBe(first.width);
		expect(second.height).toBe(first.height);
	}, 60000);

	it("throws instead of returning garbage on a non-HEIF buffer", async () => {
		const garbage = new TextEncoder().encode("not a heif file").buffer;
		await expect(heicDecoder.decode(garbage)).rejects.toThrow();
	}, 60000);
});
