import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { jsquashWebp } from "../jsquash-webp";

// jSquash ships its WASM binaries as sibling files under each package's
// `codec/` directory, but its `decode`/`encode` entry points load them via
// `fetch()`. Under Node/vitest there is no `file://` fetch, so
// `jsquashWebp.run(...)` throws `NotSupportedError` unless the WASM is
// preloaded manually before any test touches the engine.
//
// We resolve the on-disk WASM paths through `require.resolve` on each
// package's public entry point, then walk to its (documented, stable)
// `codec/` layout — rather than hardcoding the pnpm content-addressed store
// path (e.g. `node_modules/.pnpm/@jsquash+png@3.1.1/...`), which changes on
// every version bump. This still assumes the `codec/` subdirectory layout
// itself doesn't move, which is a property of jSquash's package structure
// rather than of the package manager.
const require = createRequire(import.meta.url);

const pngPackageRoot = dirname(require.resolve("@jsquash/png/decode"));
const webpEncodeRoot = dirname(require.resolve("@jsquash/webp/encode"));
const webpDecodeRoot = dirname(require.resolve("@jsquash/webp/decode"));

const PNG_WASM = join(pngPackageRoot, "codec/pkg/squoosh_png_bg.wasm");
const WEBP_ENC_WASM = join(webpEncodeRoot, "codec/enc/webp_enc.wasm");
const WEBP_DEC_WASM = join(webpDecodeRoot, "codec/dec/webp_dec.wasm");

// Substitution note: the brief points at `e2e/fixtures/diagram.png`, which
// belongs to a concurrently running task and does not exist yet. This reads
// an already-committed, genuine 1600x1280 RGBA screenshot instead, which
// exercises the PNG decoder far more than a synthetic swatch would. Path is
// relative to the repo root, matching how `pnpm vitest run` is invoked (and
// the convention the brief itself used for the `e2e/fixtures` path).
const source = readFileSync("docs/design/webm-to-mp4.png");
const input = source.buffer.slice(
	source.byteOffset,
	source.byteOffset + source.byteLength,
);

beforeAll(async () => {
	// PNG uses wasm-bindgen: init takes a compiled WebAssembly.Module.
	const pngDecodeMod = await import("@jsquash/png/decode");
	await pngDecodeMod.init(await WebAssembly.compile(readFileSync(PNG_WASM)));

	// WebP uses Emscripten: `wasmBinary` bypasses fetching entirely.
	const webpEncMod = await import("@jsquash/webp/encode");
	await webpEncMod.init({ wasmBinary: readFileSync(WEBP_ENC_WASM) } as never);
	const webpDecMod = await import("@jsquash/webp/decode");
	await webpDecMod.init({ wasmBinary: readFileSync(WEBP_DEC_WASM) } as never);
}, 60000);

describe("jsquash-webp fidelity", () => {
	it("produces a valid WebP with the RIFF/WEBP signature", async () => {
		const out = await jsquashWebp.run(
			input.slice(0),
			{ lossless: 1, quality: 100 },
			() => {},
		);
		const header = new Uint8Array(out.slice(0, 12));
		const tag = String.fromCharCode(...header.slice(0, 4));
		const format = String.fromCharCode(...header.slice(8, 12));
		expect(tag).toBe("RIFF");
		expect(format).toBe("WEBP");
	}, 60000);

	it("round-trips lossless output to pixel-identical image data", async () => {
		const { default: decodePng } = await import("@jsquash/png/decode");
		const { default: decodeWebp } = await import("@jsquash/webp/decode");

		const original = await decodePng(input.slice(0));
		const encoded = await jsquashWebp.run(
			input.slice(0),
			{ lossless: 1, quality: 100 },
			() => {},
		);
		const decoded = await decodeWebp(encoded);

		expect(decoded.width).toBe(original.width);
		expect(decoded.height).toBe(original.height);
		expect(decoded.data.length).toBe(original.data.length);

		// Scan rather than deep-equal: this fixture is ~8.2M subpixels, and
		// Array.from on both sides would allocate two 8M-element arrays before
		// comparing. The scan also reports WHERE fidelity broke, not just that
		// it did.
		let firstMismatch = -1;
		for (let i = 0; i < original.data.length; i += 1) {
			if (decoded.data[i] !== original.data[i]) {
				firstMismatch = i;
				break;
			}
		}
		expect(
			firstMismatch,
			`first differing subpixel at index ${firstMismatch}`,
		).toBe(-1);
	}, 60000);

	it("reports monotonically increasing progress ending at 1", async () => {
		const ticks: number[] = [];
		await jsquashWebp.run(input.slice(0), { lossless: 1 }, (r) =>
			ticks.push(r),
		);
		expect(ticks.at(-1)).toBe(1);
		expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
	}, 60000);
});
