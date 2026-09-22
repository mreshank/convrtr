import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { kraToPngEngine } from "../index";
import { convertKraToPng, parseKra } from "../parser";

describe("Krita (.kra) Parser & Engine", () => {
	const samplePng = encodeRgbaToPng(
		16,
		16,
		new Uint8Array(16 * 16 * 4).fill(200),
	);

	it("extracts mergedimage.png from a Krita document", () => {
		const zipped = fflate.zipSync({
			"maindoc.xml": new TextEncoder().encode("<document/>"),
			"mergedimage.png": samplePng,
			"preview.png": encodeRgbaToPng(4, 4, new Uint8Array(4 * 4 * 4)),
		});

		const result = parseKra(zipped);
		expect(result.source).toBe("mergedimage");
		expect(result.width).toBe(16);
		expect(result.height).toBe(16);
		expect(result.pngData[0]).toBe(0x89);
		expect(result.pngData[1]).toBe(0x50);
	});

	it("falls back to preview.png when the merged image is missing", () => {
		const preview = encodeRgbaToPng(32, 8, new Uint8Array(32 * 8 * 4));
		const zipped = fflate.zipSync({
			"maindoc.xml": new TextEncoder().encode("<document/>"),
			"preview.png": preview,
		});

		const result = parseKra(zipped);
		expect(result.source).toBe("preview");
		expect(result.width).toBe(32);
		expect(result.height).toBe(8);
	});

	it("converts end-to-end through the engine", async () => {
		const zipped = fflate.zipSync({
			"mergedimage.png": samplePng,
		});
		const input = zipped.buffer.slice(
			zipped.byteOffset,
			zipped.byteOffset + zipped.byteLength,
		);
		expect(await kraToPngEngine.probe()).toBe(true);
		const out = await convertKraToPng(input, () => {});
		expect(new Uint8Array(out)[0]).toBe(0x89);
	});

	it("throws on non-ZIP input", () => {
		const fake = new Uint8Array(20).fill(0xaa);
		expect(() => parseKra(fake)).toThrow("PKZIP");
	});

	it("throws when the archive holds no artwork", () => {
		const emptyZip = fflate.zipSync({
			"maindoc.xml": new TextEncoder().encode("<document/>"),
		});
		expect(() => parseKra(emptyZip)).toThrow("No flattened artwork preview");
	});
});
