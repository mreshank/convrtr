import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { getSample, SAMPLES } from "@/content/samples/registry";
import { stripPngMetadata } from "@/core/engines/metadata/png";

describe("samples registry", () => {
	it("points at files that exist on disk", () => {
		for (const sample of SAMPLES) {
			expect(existsSync(`public${sample.source}`), `${sample.id} missing`).toBe(
				true,
			);
		}
	});

	it("records the real byte size of each file", () => {
		// A manifest whose sizes drift from the files is worse than no
		// manifest — the demo would report a number it did not measure.
		for (const sample of SAMPLES) {
			expect(sample.bytes).toBe(statSync(`public${sample.source}`).size);
		}
	});

	it("resolves a known id and rejects an unknown one", () => {
		const first = SAMPLES[0];
		expect(first).toBeDefined();
		if (first) expect(getSample(first.id)?.id).toBe(first.id);
		expect(getSample("no-such-sample")).toBeUndefined();
	});
});

/**
 * "Genuinely decode" means the app's own decoders accept the bytes, not that
 * the byte layout merely looks plausible — a PNG with a correct-looking
 * header that no real decoder accepts would make every demo built on it a
 * lie. These tests run the same decode paths `LiveDemo` and the tool routes
 * actually use, over the exact files committed under `public/samples/`.
 *
 * The WASM-bootstrap dance below is not new here — it is the same one
 * `core/engines/image/__tests__/png-encoder.test.ts` and
 * `core/engines/__tests__/fidelity.test.ts` already carry, for the same
 * reason: under Node/vitest there is no `file://` fetch, so jsquash's
 * WASM has to be compiled and injected by hand before anything calls decode.
 */
const require = createRequire(import.meta.url);
const pngPackageRoot = dirname(require.resolve("@jsquash/png/decode"));
const PNG_WASM = join(pngPackageRoot, "codec/pkg/squoosh_png_bg.wasm");

beforeAll(async () => {
	const compiled = await WebAssembly.compile(readFileSync(PNG_WASM));
	const pngDecodeMod = await import("@jsquash/png/decode");
	await pngDecodeMod.init(compiled);
}, 60000);

describe("the generated samples genuinely decode", () => {
	it("tagged-photo.png decodes with the app's real PNG decoder", async () => {
		const sample = getSample("tagged-photo-png");
		expect(sample).toBeDefined();
		if (!sample) return;

		const bytes = readFileSync(`public${sample.source}`);
		const { default: decodePng } = await import("@jsquash/png/decode");
		const image = await decodePng(
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		);

		expect(image.width).toBeGreaterThan(0);
		expect(image.height).toBeGreaterThan(0);
		expect(image.data.length).toBe(image.width * image.height * 4);
	});

	it("the app's real metadata-strip engine finds real metadata to remove", async () => {
		// Proves the sample is not just decodable but actually carries the
		// tEXt/tIME chunks the demo claims to strip -- run through the exact
		// function `metadata:strip-png` (core/engines/metadata/index.ts) wraps
		// as an engine, not a re-implementation of it.
		const sample = getSample("tagged-photo-png");
		expect(sample).toBeDefined();
		if (!sample) return;

		const bytes = readFileSync(`public${sample.source}`);
		const input = bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		);
		const stripped = stripPngMetadata(input);

		expect(stripped.byteLength).toBeLessThan(input.byteLength);

		// And the stripped result must itself still be a real, decodable PNG —
		// stripping metadata must never corrupt the pixel data it copies
		// verbatim.
		const { default: decodePng } = await import("@jsquash/png/decode");
		const decoded = await decodePng(stripped);
		expect(decoded.width).toBeGreaterThan(0);
		expect(decoded.height).toBeGreaterThan(0);
	});

	it("podcast-clip.wav decodes with the app's real WAV parser", async () => {
		const sample = getSample("podcast-clip-wav");
		expect(sample).toBeDefined();
		if (!sample) return;

		const bytes = readFileSync(`public${sample.source}`);
		const { parseWav } = await import("@/core/engines/audio/wav");
		const audio = parseWav(
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		);

		expect(audio.channels).toBe(1);
		expect(audio.bitsPerSample).toBe(16);
		expect(audio.sampleRate).toBeGreaterThan(0);
		expect(audio.samples[0]?.length).toBeGreaterThan(0);
		// Not silence: a real, non-trivial waveform is what makes normalising
		// it demonstrate a real gain change rather than a no-op on zeros.
		const peak = Math.max(...Array.from(audio.samples[0] ?? [], Math.abs));
		expect(peak).toBeGreaterThan(0);
	});
});
