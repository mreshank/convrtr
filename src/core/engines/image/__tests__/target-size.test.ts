import { describe, expect, it } from "vitest";
import { encodeToTargetSize } from "../target-size";
import type { ImageEncoder } from "../types";

function img(): ImageData {
	return {
		width: 2,
		height: 2,
		data: new Uint8ClampedArray(16),
		colorSpace: "srgb",
	} as ImageData;
}

/**
 * Encoder whose output size is a monotonic function of quality, standing in
 * for a real codec: size grows with quality, which is the only property the
 * search relies on.
 */
function sizedEncoder(sizeAt: (quality: number) => number): ImageEncoder & {
	qualities: number[];
} {
	const qualities: number[] = [];
	return {
		id: "stub",
		mime: "image/stub",
		qualities,
		probe: async () => true,
		encode: async (_image, params) => {
			const quality = Number(params.quality ?? 100);
			qualities.push(quality);
			return new ArrayBuffer(sizeAt(quality));
		},
	};
}

describe("encodeToTargetSize", () => {
	it("finds the highest quality that fits the target", async () => {
		// size = quality * 10, so target 500 admits quality 50 exactly.
		const encoder = sizedEncoder((q) => q * 10);
		const result = await encodeToTargetSize(encoder, img(), {}, 500);
		expect(result.achieved).toBe(true);
		expect(result.output.byteLength).toBeLessThanOrEqual(500);
		expect(result.quality).toBe(50);
	});

	it("errs on the side of being under the target, never over", async () => {
		// A file that misses an upload limit by a few bytes is useless.
		const encoder = sizedEncoder((q) => q * 10 + 7);
		const result = await encodeToTargetSize(encoder, img(), {}, 500);
		expect(result.output.byteLength).toBeLessThanOrEqual(500);
	});

	it("resolves the whole range in at most seven encodes", async () => {
		// Each attempt is a full encode; an unbounded search would cost the user
		// real time for an imperceptible gain.
		const encoder = sizedEncoder((q) => q * 10);
		const result = await encodeToTargetSize(encoder, img(), {}, 500);
		expect(result.attempts).toBeLessThanOrEqual(7);
	});

	it("reports achieved:false instead of silently returning an oversized file", async () => {
		// Every quality overshoots. The caller still gets the smallest possible
		// result, but must be able to tell the user the target was unreachable.
		const encoder = sizedEncoder(() => 10_000);
		const result = await encodeToTargetSize(encoder, img(), {}, 500);
		expect(result.achieved).toBe(false);
		expect(result.output.byteLength).toBe(10_000);
	});

	it("returns the smallest attempt when the target is unreachable", async () => {
		const encoder = sizedEncoder((q) => 1000 + q);
		const result = await encodeToTargetSize(encoder, img(), {}, 100);
		expect(result.achieved).toBe(false);
		// Smallest means lowest quality tried, not merely the last one.
		expect(result.output.byteLength).toBe(1000 + result.quality);
		expect(result.quality).toBeLessThan(50);
	});

	it("forces lossless off so the search is not a no-op", async () => {
		const encoder = sizedEncoder((q) => q * 10);
		await encodeToTargetSize(encoder, img(), { lossless: 1 }, 500);
		// Every attempt must vary quality; a stuck lossless flag would make all
		// attempts identical and the search meaningless.
		expect(new Set(encoder.qualities).size).toBeGreaterThan(1);
	});

	it("rejects a non-positive target", async () => {
		const encoder = sizedEncoder((q) => q);
		await expect(encodeToTargetSize(encoder, img(), {}, 0)).rejects.toThrow();
	});
});
