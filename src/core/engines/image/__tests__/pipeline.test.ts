import { describe, expect, it, vi } from "vitest";
import { createImagePipelineEngine } from "../pipeline";
import type { ImageDecoder, ImageEncoder } from "../types";

const stubImage: ImageData = {
	width: 1,
	height: 1,
	data: new Uint8ClampedArray([0, 0, 0, 255]),
	colorSpace: "srgb",
};

function stubDecoder(id: string, supported: boolean): ImageDecoder {
	return {
		id,
		mime: [`image/${id}`],
		probe: vi.fn(async () => supported),
		decode: vi.fn(async () => stubImage),
	};
}

function stubEncoder(id: string, supported: boolean): ImageEncoder {
	return {
		id,
		mime: `image/${id}`,
		probe: vi.fn(async () => supported),
		encode: vi.fn(async () => new ArrayBuffer(4)),
	};
}

describe("createImagePipelineEngine", () => {
	it("derives its id from the decoder and encoder ids", () => {
		const engine = createImagePipelineEngine(
			"a",
			"b",
			new Map([["a", stubDecoder("a", true)]]),
			new Map([["b", stubEncoder("b", true)]]),
		);
		expect(engine.id).toBe("image:a->b");
	});

	it("probes true when both halves probe true", async () => {
		const engine = createImagePipelineEngine(
			"a",
			"b",
			new Map([["a", stubDecoder("a", true)]]),
			new Map([["b", stubEncoder("b", true)]]),
		);
		expect(await engine.probe()).toBe(true);
	});

	it("probes false when the decoder is unsupported", async () => {
		const engine = createImagePipelineEngine(
			"a",
			"b",
			new Map([["a", stubDecoder("a", false)]]),
			new Map([["b", stubEncoder("b", true)]]),
		);
		expect(await engine.probe()).toBe(false);
	});

	it("probes false when the encoder is unsupported", async () => {
		const engine = createImagePipelineEngine(
			"a",
			"b",
			new Map([["a", stubDecoder("a", true)]]),
			new Map([["b", stubEncoder("b", false)]]),
		);
		expect(await engine.probe()).toBe(false);
	});

	it("probes false when the decoder or encoder id is unregistered", async () => {
		const engine = createImagePipelineEngine(
			"missing",
			"missing",
			new Map(),
			new Map(),
		);
		expect(await engine.probe()).toBe(false);
	});

	it("reports monotonically increasing progress through DECODE then ENCODE, ending at 1", async () => {
		const engine = createImagePipelineEngine(
			"a",
			"b",
			new Map([["a", stubDecoder("a", true)]]),
			new Map([["b", stubEncoder("b", true)]]),
		);

		const ticks: Array<{ ratio: number; phase: string }> = [];
		await engine.run(new ArrayBuffer(0), {}, (ratio, phase) => {
			ticks.push({ ratio, phase });
		});

		const ratios = ticks.map((t) => t.ratio);
		expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
		expect(ratios.at(-1)).toBe(1);

		const phases = ticks.map((t) => t.phase);
		expect(phases).toContain("DECODE");
		expect(phases).toContain("ENCODE");
		expect(phases.indexOf("DECODE")).toBeLessThan(phases.lastIndexOf("ENCODE"));
	});

	it("throws instead of silently no-op'ing when run against a missing pair", async () => {
		const engine = createImagePipelineEngine(
			"missing",
			"missing",
			new Map(),
			new Map(),
		);
		await expect(
			engine.run(new ArrayBuffer(0), {}, () => {}),
		).rejects.toThrow();
	});
});
