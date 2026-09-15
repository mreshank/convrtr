import { describe, expect, it } from "vitest";
import { convertSrfToPng, srfToPngEngine } from "../index";

function createMockSrf(
	width = 64,
	height = 48,
	make = "Sony",
	model = "DSLR-A100",
): Uint8Array {
	const buffer = new Uint8Array(256);
	const view = new DataView(buffer.buffer);

	// TIFF Little-Endian Header ("II")
	buffer[0] = 0x49;
	buffer[1] = 0x49;
	view.setUint16(2, 42, true); // TIFF magic
	view.setUint32(4, 8, true); // IFD offset

	// IFD at offset 8
	const numEntries = 4;
	view.setUint16(8, numEntries, true);

	let entryPos = 10;

	// Tag 0x0100: ImageWidth (SHORT, count 1, value)
	view.setUint16(entryPos, 0x0100, true);
	view.setUint16(entryPos + 2, 3, true); // SHORT
	view.setUint32(entryPos + 4, 1, true); // count
	view.setUint16(entryPos + 8, width, true); // value
	entryPos += 12;

	// Tag 0x0101: ImageLength (SHORT, count 1, value)
	view.setUint16(entryPos, 0x0101, true);
	view.setUint16(entryPos + 2, 3, true); // SHORT
	view.setUint32(entryPos + 4, 1, true); // count
	view.setUint16(entryPos + 8, height, true); // value
	entryPos += 12;

	// Strings offset at 120
	const makeOffset = 120;
	const modelOffset = 150;

	const makeBytes = new TextEncoder().encode(make);
	buffer.set(makeBytes, makeOffset);

	const modelBytes = new TextEncoder().encode(model);
	buffer.set(modelBytes, modelOffset);

	// Tag 0x010f: Make (ASCII)
	view.setUint16(entryPos, 0x010f, true);
	view.setUint16(entryPos + 2, 2, true); // ASCII
	view.setUint32(entryPos + 4, makeBytes.length, true);
	view.setUint32(entryPos + 8, makeOffset, true);
	entryPos += 12;

	// Tag 0x0110: Model (ASCII)
	view.setUint16(entryPos, 0x0110, true);
	view.setUint16(entryPos + 2, 2, true); // ASCII
	view.setUint32(entryPos + 4, modelBytes.length, true);
	view.setUint32(entryPos + 8, modelOffset, true);
	entryPos += 12;

	return buffer;
}

describe("Sony Alpha RAW (SRF) Image Engine", () => {
	it("converts a valid mock SRF file to PNG", async () => {
		const srfBytes = createMockSrf(32, 24, "Sony", "DSLR-A100");
		const result = await convertSrfToPng(srfBytes);

		expect(result.pngBuffer.byteLength).toBeGreaterThan(50);
		expect(result.metadata.width).toBe(32);
		expect(result.metadata.height).toBe(24);
		expect(result.metadata.make).toBe("Sony");
		expect(result.metadata.model).toBe("DSLR-A100");
		expect(result.metadata.hasEmbeddedPreview).toBe(false);

		// PNG header check (0x89 0x50 0x4E 0x47)
		const view = new DataView(result.pngBuffer);
		expect(view.getUint32(0, false)).toBe(0x89504e47);
	});

	it("throws on invalid or truncated SRF files", async () => {
		await expect(convertSrfToPng(new Uint8Array([0, 1, 2]))).rejects.toThrow(
			"Invalid Sony RAW file: File size is smaller than TIFF header.",
		);

		const badMagic = new Uint8Array(20);
		badMagic[0] = 0x49;
		badMagic[1] = 0x49;
		// missing 42
		await expect(convertSrfToPng(badMagic)).rejects.toThrow(
			"Invalid Sony RAW file: Missing TIFF magic 42 constant.",
		);
	});

	it("runs through the engine interface", async () => {
		const srfBytes = createMockSrf(16, 16);
		const output = await srfToPngEngine.run(
			srfBytes.buffer.slice(0) as ArrayBuffer,
			{},
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(40);
	});
});
