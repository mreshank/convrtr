import { describe, expect, it } from "vitest";
import { createImagePipelineEngine } from "../pipeline";
import type { ImageDecoder, ImageEncoder, ImageTransform } from "../types";

function img(width: number, height: number): ImageData {
	return {
		width,
		height,
		data: new Uint8ClampedArray(width * height * 4),
		colorSpace: "srgb",
	} as ImageData;
}

function stubDecoder(id: string, image: ImageData): ImageDecoder {
	return {
		id,
		mime: [`image/${id}`],
		probe: async () => true,
		decode: async () => image,
	};
}

function stubEncoder(id: string, seen: { image?: ImageData }): ImageEncoder {
	return {
		id,
		mime: `image/${id}`,
		probe: async () => true,
		encode: async (image) => {
			seen.image = image;
			return new ArrayBuffer(1);
		},
	};
}

function stubTransform(
	id: string,
	supported: boolean,
	fn: (image: ImageData) => ImageData,
): ImageTransform {
	return {
		id,
		probe: async () => supported,
		apply: async (image) => fn(image),
	};
}

const halve = (image: ImageData) => img(image.width / 2, image.height / 2);

describe("pipeline with transforms", () => {
	it("names the transform chain in the engine id", () => {
		// image:png->jpeg and image:png-[resize]->jpeg produce different output,
		// so a tool must be able to name exactly the one it wants.
		const engine = createImagePipelineEngine("a", "b", {
			transforms: ["resize"],
			decoders: new Map([["a", stubDecoder("a", img(4, 4))]]),
			encoders: new Map([["b", stubEncoder("b", {})]]),
			transformRegistry: new Map([
				["resize", stubTransform("resize", true, halve)],
			]),
		});
		expect(engine.id).toBe("image:a-[resize]->b");
	});

	it("leaves the id unchanged when there are no transforms", () => {
		const engine = createImagePipelineEngine("a", "b", {
			decoders: new Map([["a", stubDecoder("a", img(4, 4))]]),
			encoders: new Map([["b", stubEncoder("b", {})]]),
		});
		expect(engine.id).toBe("image:a->b");
	});

	it("applies transforms between decode and encode", async () => {
		const seen: { image?: ImageData } = {};
		const engine = createImagePipelineEngine("a", "b", {
			transforms: ["resize"],
			decoders: new Map([["a", stubDecoder("a", img(8, 8))]]),
			encoders: new Map([["b", stubEncoder("b", seen)]]),
			transformRegistry: new Map([
				["resize", stubTransform("resize", true, halve)],
			]),
		});

		await engine.run(new ArrayBuffer(0), {}, () => {});
		expect(seen.image?.width).toBe(4);
		expect(seen.image?.height).toBe(4);
	});

	it("applies multiple transforms in declared order", async () => {
		const order: string[] = [];
		const record = (id: string) =>
			stubTransform(id, true, (image) => {
				order.push(id);
				return image;
			});

		const engine = createImagePipelineEngine("a", "b", {
			transforms: ["first", "second"],
			decoders: new Map([["a", stubDecoder("a", img(4, 4))]]),
			encoders: new Map([["b", stubEncoder("b", {})]]),
			transformRegistry: new Map([
				["first", record("first")],
				["second", record("second")],
			]),
		});

		await engine.run(new ArrayBuffer(0), {}, () => {});
		expect(order).toEqual(["first", "second"]);
	});

	it("probes false when a transform is unsupported on this device", async () => {
		const engine = createImagePipelineEngine("a", "b", {
			transforms: ["resize"],
			decoders: new Map([["a", stubDecoder("a", img(4, 4))]]),
			encoders: new Map([["b", stubEncoder("b", {})]]),
			transformRegistry: new Map([
				["resize", stubTransform("resize", false, halve)],
			]),
		});
		expect(await engine.probe()).toBe(false);
	});

	it("refuses to run when a named transform is unregistered", async () => {
		// The important failure mode: skipping an unknown transform would hand
		// back a full-size image while reporting success, so the user gets the
		// wrong file and is told it worked.
		const engine = createImagePipelineEngine("a", "b", {
			transforms: ["nonexistent"],
			decoders: new Map([["a", stubDecoder("a", img(4, 4))]]),
			encoders: new Map([["b", stubEncoder("b", {})]]),
			transformRegistry: new Map(),
		});
		expect(await engine.probe()).toBe(false);
		await expect(
			engine.run(new ArrayBuffer(0), {}, () => {}),
		).rejects.toThrow();
	});

	it("reports a TRANSFORM phase with monotonic progress ending at 1", async () => {
		const engine = createImagePipelineEngine("a", "b", {
			transforms: ["resize"],
			decoders: new Map([["a", stubDecoder("a", img(4, 4))]]),
			encoders: new Map([["b", stubEncoder("b", {})]]),
			transformRegistry: new Map([
				["resize", stubTransform("resize", true, halve)],
			]),
		});

		const ticks: Array<{ ratio: number; phase: string }> = [];
		await engine.run(new ArrayBuffer(0), {}, (ratio, phase) =>
			ticks.push({ ratio, phase }),
		);

		const ratios = ticks.map((t) => t.ratio);
		expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
		expect(ratios.at(-1)).toBe(1);
		expect(ticks.map((t) => t.phase)).toContain("TRANSFORM");
	});
});
