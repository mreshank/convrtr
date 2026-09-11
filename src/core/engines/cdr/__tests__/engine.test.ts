import * as fflate from "fflate";
import { describe, expect, it, vi } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { cdrToPngEngine } from "../index";
import { parseCdr } from "../parser";

describe("CorelDRAW (.cdr) Parser & Engine", () => {
	const samplePng = encodeRgbaToPng(
		16,
		16,
		new Uint8Array(16 * 16 * 4).fill(120),
	);

	it("extracts previews/thumbnail.png from modern PKZIP CorelDRAW file", () => {
		const zipFiles: Record<string, Uint8Array> = {
			"content/riffData.cdr": new Uint8Array([1, 2, 3, 4]),
			"metadata/metadata.xml": new TextEncoder().encode("<metadata/>"),
			"previews/thumbnail.png": samplePng,
		};
		const zipped = fflate.zipSync(zipFiles);

		const result = parseCdr(zipped);
		expect(result.source).toBe("zip-thumbnail");
		expect(result.width).toBe(16);
		expect(result.height).toBe(16);
		expect(result.pngData[0]).toBe(0x89);
		expect(result.pngData[1]).toBe(0x50);
	});

	it("extracts from metadata/thumbnails/thumbnail.png or largest PNG fallback", () => {
		const smallPng = encodeRgbaToPng(4, 4, new Uint8Array(4 * 4 * 4));
		const largePng = encodeRgbaToPng(32, 32, new Uint8Array(32 * 32 * 4));

		const zipFiles: Record<string, Uint8Array> = {
			"small_icon.png": smallPng,
			"page_composite.png": largePng,
		};
		const zipped = fflate.zipSync(zipFiles);

		const result = parseCdr(zipped);
		expect(result.source).toBe("zip-thumbnail");
		expect(result.width).toBe(32);
		expect(result.height).toBe(32);
	});

	it("extracts embedded PNG from legacy RIFF CorelDRAW container", () => {
		// Construct RIFF header + payload with embedded PNG
		const riffHeader = new Uint8Array(12);
		riffHeader.set([0x52, 0x49, 0x46, 0x46]); // RIFF
		riffHeader.set([0x43, 0x44, 0x52, 0x39], 8); // CDR9

		const combined = new Uint8Array(riffHeader.length + samplePng.length + 8);
		combined.set(riffHeader, 0);
		combined.set(samplePng, 12);

		const result = parseCdr(combined);
		expect(result.source).toBe("riff-embedded");
		expect(result.width).toBe(16);
		expect(result.height).toBe(16);
	});

	it("throws an error when file is not a valid CorelDRAW container", () => {
		expect(() => parseCdr(new Uint8Array([1, 2, 3]))).toThrow(
			"smaller than 16 bytes",
		);

		const fakeData = new Uint8Array(20).fill(0xaa);
		expect(() => parseCdr(fakeData)).toThrow(
			"Missing PKZIP (X4+) or RIFF (v1-v13) container signature",
		);
	});

	it("throws an error when modern CorelDRAW archive has no images", () => {
		const emptyZip = fflate.zipSync({
			"document.xml": new TextEncoder().encode("<doc/>"),
		});
		expect(() => parseCdr(emptyZip)).toThrow(
			"No embedded thumbnail preview found",
		);
	});

	it("runs the full conversion engine and produces a valid PNG buffer", async () => {
		const zipped = fflate.zipSync({
			"previews/thumbnail.png": samplePng,
		});

		const progress = vi.fn();
		const inputBuf = zipped.buffer.slice(
			zipped.byteOffset,
			zipped.byteOffset + zipped.byteLength,
		) as ArrayBuffer;
		const output = await cdrToPngEngine.run(inputBuf, {}, progress);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(progress).toHaveBeenCalledWith(1.0, "Complete");

		const bytes = new Uint8Array(output);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
	});
});
