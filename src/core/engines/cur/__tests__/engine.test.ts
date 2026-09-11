import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { curToPngEngine } from "../index";
import { parseCur } from "../parser";

function buildMockCurWithPng(): Uint8Array {
	const dummyPng = encodeRgbaToPng(4, 4, new Uint8Array(4 * 4 * 4).fill(255));
	const curBytes = new Uint8Array(6 + 16 + dummyPng.length);
	const view = new DataView(curBytes.buffer);

	// Header: idReserved = 0, idType = 2 (CUR), idCount = 1
	view.setUint16(0, 0, true);
	view.setUint16(2, 2, true);
	view.setUint16(4, 1, true);

	// Entry 0
	curBytes[6] = 4; // width
	curBytes[7] = 4; // height
	curBytes[8] = 0; // colorCount
	curBytes[9] = 0; // reserved
	view.setUint16(10, 1, true); // xHotspot
	view.setUint16(12, 2, true); // yHotspot
	view.setUint32(14, dummyPng.length, true); // bytesInRes
	view.setUint32(18, 22, true); // imageOffset

	// Copy PNG
	curBytes.set(dummyPng, 22);

	return curBytes;
}

function buildMockCurWithDib32(): Uint8Array {
	const width = 2;
	const height = 2;
	const biHeight = height * 2; // 4 (XOR + AND)
	const xorRowStride = 8; // 2 * 4 bytes
	const andRowStride = 4; // 1-bit row padded to 4 bytes

	const dibSize = 40 + xorRowStride * height + andRowStride * height;
	const curBytes = new Uint8Array(6 + 16 + dibSize);
	const view = new DataView(curBytes.buffer);

	// Header
	view.setUint16(0, 0, true);
	view.setUint16(2, 2, true); // CUR
	view.setUint16(4, 1, true);

	// Entry 0
	curBytes[6] = width;
	curBytes[7] = height;
	view.setUint16(10, 0, true); // xHotspot = 0
	view.setUint16(12, 0, true); // yHotspot = 0
	view.setUint32(14, dibSize, true);
	view.setUint32(18, 22, true);

	// BITMAPINFOHEADER at offset 22
	const dibOff = 22;
	view.setUint32(dibOff, 40, true); // biSize
	view.setInt32(dibOff + 4, width, true);
	view.setInt32(dibOff + 8, biHeight, true);
	view.setUint16(dibOff + 12, 1, true); // biPlanes
	view.setUint16(dibOff + 14, 32, true); // biBitCount = 32
	view.setUint32(dibOff + 16, 0, true); // biCompression = BI_RGB

	// XOR pixels (BGRA, bottom-up)
	const xorStart = dibOff + 40;
	// Row 0 (bottom row): 2 pixels
	curBytes[xorStart + 0] = 0; // B
	curBytes[xorStart + 1] = 0; // G
	curBytes[xorStart + 2] = 255; // R (Red)
	curBytes[xorStart + 3] = 255; // A

	curBytes[xorStart + 4] = 255; // B (Blue)
	curBytes[xorStart + 5] = 0;
	curBytes[xorStart + 6] = 0;
	curBytes[xorStart + 7] = 255;

	// Row 1 (top row): 2 pixels
	curBytes[xorStart + 8] = 0;
	curBytes[xorStart + 9] = 255; // G (Green)
	curBytes[xorStart + 10] = 0;
	curBytes[xorStart + 11] = 255;

	curBytes[xorStart + 12] = 0;
	curBytes[xorStart + 13] = 0;
	curBytes[xorStart + 14] = 0;
	curBytes[xorStart + 15] = 0; // Transparent pixel

	return curBytes;
}

describe("curToPngEngine & CUR Parser", () => {
	it("probes successfully", async () => {
		const supported = await curToPngEngine.probe();
		expect(supported).toBe(true);
	});

	it("extracts embedded PNG cursor with preserved hotspot", () => {
		const curBytes = buildMockCurWithPng();
		const result = parseCur(curBytes);

		expect(result.width).toBe(4);
		expect(result.height).toBe(4);
		expect(result.hotspotX).toBe(1);
		expect(result.hotspotY).toBe(2);
		expect(result.pngData.length).toBeGreaterThan(0);
		// Check PNG magic
		expect(result.pngData[0]).toBe(0x89);
		expect(result.pngData[1]).toBe(0x50);
	});

	it("decodes 32-bit DIB cursor to transparent PNG", () => {
		const curBytes = buildMockCurWithDib32();
		const result = parseCur(curBytes);

		expect(result.width).toBe(2);
		expect(result.height).toBe(2);
		expect(result.hotspotX).toBe(0);
		expect(result.hotspotY).toBe(0);
		expect(result.pngData[0]).toBe(0x89);
		expect(result.pngData[1]).toBe(0x50);
		expect(result.pngData[2]).toBe(0x4e);
		expect(result.pngData[3]).toBe(0x47);
	});

	it("runs end-to-end via engine producing valid PNG ArrayBuffer", async () => {
		const curBytes = buildMockCurWithDib32();
		const progress: string[] = [];

		const result = await curToPngEngine.run(
			curBytes.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const raw = new Uint8Array(result);
		expect(raw[0]).toBe(0x89);
		expect(raw[1]).toBe(0x50);
		expect(raw[2]).toBe(0x4e);
		expect(raw[3]).toBe(0x47);

		expect(progress).toContain("PARSING_CUR");
		expect(progress).toContain("EXTRACTING_PNG");
		expect(progress).toContain("DONE");
	});

	it("rejects invalid cursor binary files", async () => {
		const invalid = new Uint8Array(22);
		invalid[2] = 99; // Invalid resource type
		expect(() => parseCur(invalid)).toThrow(
			/resource type 99 is not a valid cursor/i,
		);
	});
});
