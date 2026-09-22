import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { sketchToPngEngine } from "../index";
import { convertSketchToPng, parseSketch } from "../parser";

describe("Sketch (.sketch) Parser & Engine", () => {
	const samplePng = encodeRgbaToPng(
		24,
		12,
		new Uint8Array(24 * 12 * 4).fill(150),
	);

	it("extracts previews/preview.png from a Sketch document", () => {
		const zipped = fflate.zipSync({
			"document.json": new TextEncoder().encode("{}"),
			"previews/preview.png": samplePng,
		});

		const result = parseSketch(zipped);
		expect(result.source).toBe("page-preview");
		expect(result.width).toBe(24);
		expect(result.height).toBe(12);
		expect(result.pngData[0]).toBe(0x89);
	});

	it("falls back to the largest PNG render", () => {
		const smallPng = encodeRgbaToPng(4, 4, new Uint8Array(4 * 4 * 4));
		const largePng = encodeRgbaToPng(48, 48, new Uint8Array(48 * 48 * 4));
		const zipped = fflate.zipSync({
			"previews/small.png": smallPng,
			"previews/page-2.png": largePng,
		});

		const result = parseSketch(zipped);
		expect(result.source).toBe("largest-png-fallback");
		expect(result.width).toBe(48);
		expect(result.height).toBe(48);
	});

	it("converts end-to-end through the engine", async () => {
		const zipped = fflate.zipSync({
			"previews/preview.png": samplePng,
		});
		const input = zipped.buffer.slice(
			zipped.byteOffset,
			zipped.byteOffset + zipped.byteLength,
		);
		expect(await sketchToPngEngine.probe()).toBe(true);
		const out = await convertSketchToPng(input, () => {});
		expect(new Uint8Array(out)[0]).toBe(0x89);
	});

	it("throws on non-ZIP input", () => {
		expect(() => parseSketch(new Uint8Array(20).fill(0x07))).toThrow("PKZIP");
	});

	it("throws when the archive holds no page render", () => {
		const emptyZip = fflate.zipSync({
			"document.json": new TextEncoder().encode("{}"),
		});
		expect(() => parseSketch(emptyZip)).toThrow("No page preview");
	});
});
