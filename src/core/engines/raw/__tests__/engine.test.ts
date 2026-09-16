import { describe, expect, it } from "vitest";
import { convertRawToPng, rawToPngEngine } from "../index";

function createMockRaw(
	width = 64,
	height = 48,
	make = "Canon",
	model = "EOS 5D",
): Uint8Array {
	const buffer = new Uint8Array(256);
	const view = new DataView(buffer.buffer);

	// TIFF Little-Endian Header ("II")
	buffer[0] = 0x49;
	buffer[1] = 0x49;
	view.setUint16(2, 42, true); // TIFF magic 42
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

describe("Universal Camera RAW (RAW/DNG) Image Engine", () => {
	it("converts a valid mock RAW file to PNG", async () => {
		const rawBytes = createMockRaw(32, 24, "Nikon", "D850");
		const result = await convertRawToPng(rawBytes);

		expect(result.pngBuffer.byteLength).toBeGreaterThan(50);
		expect(result.metadata.width).toBe(32);
		expect(result.metadata.height).toBe(24);
		expect(result.metadata.make).toBe("Nikon");
		expect(result.metadata.model).toBe("D850");
		expect(result.metadata.hasEmbeddedPreview).toBe(false);

		// PNG header check (0x89 0x50 0x4E 0x47)
		const view = new DataView(result.pngBuffer);
		expect(view.getUint32(0, false)).toBe(0x89504e47);
	});

	it("throws on invalid or truncated RAW files", async () => {
		await expect(convertRawToPng(new Uint8Array([0, 1, 2]))).rejects.toThrow(
			"Invalid RAW file: File size is smaller than the minimum header size.",
		);
	});

	it("runs through the engine interface", async () => {
		const rawBytes = createMockRaw(16, 16);
		const output = await rawToPngEngine.run(
			rawBytes.buffer.slice(0) as ArrayBuffer,
			{},
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(40);
	});
});
