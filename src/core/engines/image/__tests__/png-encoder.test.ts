import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { pngEncoder } from "../encoders/png";

// Same jSquash-fetches-WASM-by-URL problem `src/core/engines/__tests__/
// fidelity.test.ts` documents: under Node/vitest there is no `file://`
// fetch, so this manually compiles and injects the WASM before any test
// touches the encoder. `@jsquash/png/decode` and `@jsquash/png/encode` are
// two separate ES modules but both load the *same* underlying wasm-bindgen
// glue file (`codec/pkg/squoosh_png.js`, and therefore the same
// `squoosh_png_bg.wasm`) — that glue module has one shared, idempotent
// `wasm` singleton, so initialising decode's copy and encode's copy with the
// same compiled `WebAssembly.Module` is safe and each call after the first
// is a no-op.
const require = createRequire(import.meta.url);
const pngPackageRoot = dirname(require.resolve("@jsquash/png/decode"));
const PNG_WASM = join(pngPackageRoot, "codec/pkg/squoosh_png_bg.wasm");
const oxipngPackageRoot = dirname(require.resolve("@jsquash/oxipng/optimise"));
const OXIPNG_WASM = join(oxipngPackageRoot, "codec/pkg/squoosh_oxipng_bg.wasm");

// Reuses the same fixture as `fidelity.test.ts` for the same reason: a real,
// already-committed 1600x1280 RGBA screenshot exercises the encoder far more
// than a synthetic swatch would.
const source = readFileSync("docs/design/webm-to-mp4.png");
const input = source.buffer.slice(
	source.byteOffset,
	source.byteOffset + source.byteLength,
);

beforeAll(async () => {
	// Both PNG and oxipng are wasm-bindgen builds: init takes a compiled
	// WebAssembly.Module directly.
	const compiledPng = await WebAssembly.compile(readFileSync(PNG_WASM));
	const pngDecodeMod = await import("@jsquash/png/decode");
	await pngDecodeMod.init(compiledPng);
	const pngEncodeMod = await import("@jsquash/png/encode");
	await pngEncodeMod.init(compiledPng);

	const compiledOxipng = await WebAssembly.compile(readFileSync(OXIPNG_WASM));
	const oxipngMod = await import("@jsquash/oxipng/optimise");
	await oxipngMod.init(compiledOxipng);
}, 60000);

describe("png encoder + oxipng optimise", () => {
	it("produces a valid PNG with the standard 8-byte signature", async () => {
		const { default: decodePng } = await import("@jsquash/png/decode");
		const original = await decodePng(input.slice(0));

		const encoded = await pngEncoder.encode(original, {});
		const header = new Uint8Array(encoded.slice(0, 8));
		expect(Array.from(header)).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
	}, 60000);

	it("shrinks (or at least never grows) the file when optimised, without touching a single decoded pixel", async () => {
		const { default: decodePng } = await import("@jsquash/png/decode");
		const original = await decodePng(input.slice(0));

		const unoptimised = await pngEncoder.encode(original, {
			optimise: false,
		});
		const optimised = await pngEncoder.encode(original, {
			optimise: true,
			optimiseLevel: 2,
		});

		expect(optimised.byteLength).toBeLessThanOrEqual(unoptimised.byteLength);

		const roundTripped = await decodePng(optimised.slice(0));
		expect(roundTripped.width).toBe(original.width);
		expect(roundTripped.height).toBe(original.height);
		expect(roundTripped.data.length).toBe(original.data.length);

		// Scan rather than deep-equal for the same reason `fidelity.test.ts`
		// does: ~8.2M subpixels, and this also reports WHERE fidelity broke.
		let firstMismatch = -1;
		for (let i = 0; i < original.data.length; i += 1) {
			if (roundTripped.data[i] !== original.data[i]) {
				firstMismatch = i;
				break;
			}
		}
		expect(
			firstMismatch,
			`first differing subpixel at index ${firstMismatch}`,
		).toBe(-1);
	}, 60000);

	it("defaults to optimising when no `optimise` param is given", async () => {
		const { default: decodePng } = await import("@jsquash/png/decode");
		const original = await decodePng(input.slice(0));

		const defaulted = await pngEncoder.encode(original, {});
		const explicit = await pngEncoder.encode(original, {
			optimise: true,
			optimiseLevel: 2,
		});
		expect(defaulted.byteLength).toBe(explicit.byteLength);
	}, 60000);
});
