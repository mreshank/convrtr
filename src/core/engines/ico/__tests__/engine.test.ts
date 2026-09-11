import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { icoToPngEngine, parseIco } from "../index";

function buildMockMultiIco(): Uint8Array {
	const smallPng = encodeRgbaToPng(
		16,
		16,
		new Uint8Array(16 * 16 * 4).fill(100),
	);
	const largePng = encodeRgbaToPng(
		48,
		48,
		new Uint8Array(48 * 48 * 4).fill(200),
	);

	const headerSize = 6;
	const dirEntrySize = 16;
	const totalDirSize = headerSize + 2 * dirEntrySize; // 38

	const offset0 = totalDirSize;
	const offset1 = offset0 + smallPng.length;
	const totalSize = offset1 + largePng.length;

	const icoBytes = new Uint8Array(totalSize);
	const view = new DataView(icoBytes.buffer);

	// Header: idReserved = 0, idType = 1 (ICO), idCount = 2
	view.setUint16(0, 0, true);
	view.setUint16(2, 1, true);
	view.setUint16(4, 2, true);

	// Entry 0 (16x16)
	icoBytes[6] = 16; // width
	icoBytes[7] = 16; // height
	icoBytes[8] = 0; // colorCount
	icoBytes[9] = 0; // reserved
	view.setUint16(10, 1, true); // planes
	view.setUint16(12, 32, true); // bitCount
	view.setUint32(14, smallPng.length, true);
	view.setUint32(18, offset0, true);

	// Entry 1 (48x48)
	icoBytes[22] = 48; // width
	icoBytes[23] = 48; // height
	icoBytes[24] = 0; // colorCount
	icoBytes[25] = 0; // reserved
	view.setUint16(26, 1, true); // planes
	view.setUint16(28, 32, true); // bitCount
	view.setUint32(30, largePng.length, true);
	view.setUint32(34, offset1, true);

	// Copy payloads
	icoBytes.set(smallPng, offset0);
	icoBytes.set(largePng, offset1);

	return icoBytes;
}

function buildMockDibIco(): Uint8Array {
	const width = 2;
	const height = 2;
	const biHeight = height * 2; // 4 (XOR + AND)
	const xorRowStride = 8; // 2 * 4 bytes
	const andRowStride = 4; // 1-bit row padded to 4 bytes

	const dibSize = 40 + xorRowStride * height + andRowStride * height;
	const icoBytes = new Uint8Array(6 + 16 + dibSize);
	const view = new DataView(icoBytes.buffer);

	// Header
	view.setUint16(0, 0, true);
	view.setUint16(2, 1, true); // ICO
	view.setUint16(4, 1, true);

	// Entry 0
	icoBytes[6] = width;
	icoBytes[7] = height;
	icoBytes[8] = 0;
	icoBytes[9] = 0;
	view.setUint16(10, 1, true); // planes
	view.setUint16(12, 32, true); // bitCount
	view.setUint32(14, dibSize, true);
	view.setUint32(18, 22, true);

	// BITMAPINFOHEADER at offset 22
	const dibOff = 22;
	view.setUint32(dibOff, 40, true);
	view.setInt32(dibOff + 4, width, true);
	view.setInt32(dibOff + 8, biHeight, true);
	view.setUint16(dibOff + 12, 1, true);
	view.setUint16(dibOff + 14, 32, true);
	view.setUint32(dibOff + 16, 0, true);

	// XOR pixels (BGRA, bottom-up)
	const xorStart = dibOff + 40;
	icoBytes[xorStart + 0] = 0;
	icoBytes[xorStart + 1] = 0;
	icoBytes[xorStart + 2] = 255;
	icoBytes[xorStart + 3] = 255;

	icoBytes[xorStart + 4] = 255;
	icoBytes[xorStart + 5] = 0;
	icoBytes[xorStart + 6] = 0;
	icoBytes[xorStart + 7] = 255;

	icoBytes[xorStart + 8] = 0;
	icoBytes[xorStart + 9] = 255;
	icoBytes[xorStart + 10] = 0;
	icoBytes[xorStart + 11] = 255;

	icoBytes[xorStart + 12] = 0;
	icoBytes[xorStart + 13] = 0;
	icoBytes[xorStart + 14] = 0;
	icoBytes[xorStart + 15] = 0;

	return icoBytes;
}

describe("Windows Icon (ICO) to PNG Engine", () => {
	it("probes successfully", async () => {
		expect(await icoToPngEngine.probe()).toBe(true);
	});

	it("extracts the highest-resolution icon from multi-size bundle", () => {
		const bytes = buildMockMultiIco();
		const result = parseIco(bytes);

		expect(result.entryCount).toBe(2);
		expect(result.width).toBe(48);
		expect(result.height).toBe(48);
		expect(result.pngData[0]).toBe(0x89);
		expect(result.pngData[1]).toBe(0x50);
		expect(result.pngData[2]).toBe(0x4e);
		expect(result.pngData[3]).toBe(0x47);
	});

	it("respects preferredSize option when requested", () => {
		const bytes = buildMockMultiIco();
		const result = parseIco(bytes, { preferredSize: 16 });

		expect(result.width).toBe(16);
		expect(result.height).toBe(16);
	});

	it("decodes uncompressed 32-bit DIB icon to PNG", () => {
		const bytes = buildMockDibIco();
		const result = parseIco(bytes);

		expect(result.width).toBe(2);
		expect(result.height).toBe(2);
		expect(result.pngData[0]).toBe(0x89);
		expect(result.pngData[1]).toBe(0x50);
		expect(result.pngData[2]).toBe(0x4e);
		expect(result.pngData[3]).toBe(0x47);
	});

	it("converts end-to-end through icoToPngEngine interface", async () => {
		const bytes = buildMockMultiIco();
		const output = await icoToPngEngine.run(
			bytes.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const png = new Uint8Array(output);

		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
		expect(png[2]).toBe(0x4e);
		expect(png[3]).toBe(0x47);
	});

	it("throws on corrupted or invalid file headers", () => {
		const corrupted = new Uint8Array([0, 0, 9, 9, 1, 0]);
		expect(() => parseIco(corrupted)).toThrow(/Invalid \.ico file/);
	});
});
