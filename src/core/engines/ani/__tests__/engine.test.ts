import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { aniToPngEngine } from "../index";
import { decodeIconOrDibToPng, parseAni } from "../parser";

describe("Windows Animated Cursor (.ani) Extractor", () => {
	it("rejects files that are too small or not RIFF containers", () => {
		expect(() => parseAni(new Uint8Array([1, 2, 3]))).toThrow(
			"Invalid .ani file",
		);
		expect(() =>
			parseAni(
				new Uint8Array([
					0x4e, 0x4f, 0x54, 0x52, 0, 0, 0, 0, 0x41, 0x43, 0x4f, 0x4e,
				]),
			),
		).toThrow("Header 'NOTR' is not 'RIFF'");
	});

	it("rejects RIFF with wrong form type", () => {
		// RIFF .... WAVE
		const bytes = new Uint8Array([
			0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
		]);
		expect(() => parseAni(bytes)).toThrow("Form type 'WAVE' is not 'ACON'");
	});

	it("decodes embedded PNG frames directly", () => {
		const dummyPng = encodeRgbaToPng(2, 2, new Uint8Array(16));
		const decoded = decodeIconOrDibToPng(dummyPng);
		expect(decoded.width).toBe(2);
		expect(decoded.height).toBe(2);
		expect(decoded.pngData).toEqual(dummyPng);
	});

	it("decodes raw Windows DIB with 1-bit AND transparency mask", () => {
		// Create a 2x2 24-bit DIB
		// width=2, height=2 (in header, biHeight=4 because biHeight is 2*h in icons)
		const biSize = 40;
		const width = 2;
		const height = 2;
		const biHeight = height * 2; // 4
		const biBitCount = 24;

		// 24-bit row stride: Math.floor((2 * 24 + 31) / 32) * 4 = Math.floor(79 / 32) * 4 = 8 bytes
		const xorStride = 8;
		// 1-bit row stride: Math.floor((2 * 1 + 31) / 32) * 4 = Math.floor(33 / 32) * 4 = 4 bytes
		const andStride = 4;

		const dibLen = biSize + xorStride * height + andStride * height;
		const dibBytes = new Uint8Array(dibLen);
		const view = new DataView(dibBytes.buffer);

		view.setUint32(0, biSize, true);
		view.setInt32(4, width, true);
		view.setInt32(8, biHeight, true);
		view.setUint16(12, 1, true); // biPlanes
		view.setUint16(14, biBitCount, true); // biBitCount 24
		view.setUint32(16, 0, true); // BI_RGB

		// Bottom-up: row 1 (top of image) at offset biSize + xorStride
		// Let pixel (0,0) be red [BGR: 0, 0, 255]
		const xorRow1 = biSize + xorStride; // top row
		dibBytes[xorRow1] = 0; // B
		dibBytes[xorRow1 + 1] = 0; // G
		dibBytes[xorRow1 + 2] = 255; // R

		// AND mask: top row pixel (1,0) transparent: bit 1 in MSB of byte
		const andRow1 = biSize + xorStride * height + andStride;
		dibBytes[andRow1] = 0x40; // 0100 0000 -> pixel (1,0) transparent

		const result = decodeIconOrDibToPng(dibBytes);
		expect(result.width).toBe(2);
		expect(result.height).toBe(2);
		expect(result.pngData.length).toBeGreaterThan(30);
	});

	it("correctly parses a complete .ani container and bundles ZIP", async () => {
		// Build an in-memory RIFF ACON structure:
		// 1) anih chunk: 36 bytes
		// 2) rate chunk: 8 bytes (2 x uint32)
		// 3) seq chunk: 8 bytes (2 x uint32)
		// 4) LIST INFO chunk: INAM ("Cursor")
		// 5) LIST fram chunk: 2 icon sub-chunks (each containing an embedded PNG)

		const dummyPng1 = encodeRgbaToPng(
			2,
			2,
			new Uint8Array([
				255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
			]),
		);
		const dummyPng2 = encodeRgbaToPng(
			2,
			2,
			new Uint8Array([
				0, 0, 0, 255, 128, 128, 128, 255, 64, 64, 64, 255, 200, 200, 200, 255,
			]),
		);

		// Pad chunks to 2-byte boundary
		const pad = (n: number) => (n + 1) & ~1;

		const framChunkLen =
			4 + (8 + pad(dummyPng1.length)) + (8 + pad(dummyPng2.length));

		const infoName = "TestCursor\0";
		const infoChunkLen = 4 + (8 + pad(infoName.length));

		const totalRiffPayload =
			4 + // "ACON"
			(8 + 36) + // anih
			(8 + 8) + // rate
			(8 + 8) + // seq
			(8 + pad(infoChunkLen)) + // LIST INFO
			(8 + pad(framChunkLen)); // LIST fram

		const buffer = new ArrayBuffer(8 + totalRiffPayload);
		const bytes = new Uint8Array(buffer);
		const view = new DataView(buffer);

		// "RIFF"
		bytes[0] = 0x52;
		bytes[1] = 0x49;
		bytes[2] = 0x46;
		bytes[3] = 0x46;
		view.setUint32(4, totalRiffPayload, true);

		// "ACON"
		bytes[8] = 0x41;
		bytes[9] = 0x43;
		bytes[10] = 0x4f;
		bytes[11] = 0x4e;

		let cur = 12;

		// anih chunk
		bytes[cur++] = 0x61;
		bytes[cur++] = 0x6e;
		bytes[cur++] = 0x69;
		bytes[cur++] = 0x68;
		view.setUint32(cur, 36, true);
		cur += 4;

		view.setUint32(cur, 36, true); // cbSize
		view.setUint32(cur + 4, 2, true); // cFrames
		view.setUint32(cur + 8, 2, true); // cSteps
		view.setUint32(cur + 12, 2, true); // cx
		view.setUint32(cur + 16, 2, true); // cy
		view.setUint32(cur + 20, 32, true); // cBitCount
		view.setUint32(cur + 24, 1, true); // cPlanes
		view.setUint32(cur + 28, 10, true); // jifRate
		view.setUint32(cur + 32, 1, true); // flags (AF_ICON)
		cur += 36;

		// rate chunk
		bytes[cur++] = 0x72;
		bytes[cur++] = 0x61;
		bytes[cur++] = 0x74;
		bytes[cur++] = 0x65;
		view.setUint32(cur, 8, true);
		cur += 4;
		view.setUint32(cur, 10, true);
		view.setUint32(cur + 4, 12, true);
		cur += 8;

		// seq chunk
		bytes[cur++] = 0x73;
		bytes[cur++] = 0x65;
		bytes[cur++] = 0x71;
		bytes[cur++] = 0x20;
		view.setUint32(cur, 8, true);
		cur += 4;
		view.setUint32(cur, 0, true);
		view.setUint32(cur + 4, 1, true);
		cur += 8;

		// LIST INFO
		bytes[cur++] = 0x4c;
		bytes[cur++] = 0x49;
		bytes[cur++] = 0x53;
		bytes[cur++] = 0x54;
		view.setUint32(cur, infoChunkLen, true);
		cur += 4;
		bytes[cur++] = 0x49;
		bytes[cur++] = 0x4e;
		bytes[cur++] = 0x46;
		bytes[cur++] = 0x4f;

		// INAM subchunk
		bytes[cur++] = 0x49;
		bytes[cur++] = 0x4e;
		bytes[cur++] = 0x41;
		bytes[cur++] = 0x4d;
		view.setUint32(cur, infoName.length, true);
		cur += 4;
		for (let i = 0; i < infoName.length; i++) {
			bytes[cur + i] = infoName.charCodeAt(i);
		}
		cur += pad(infoName.length);

		// LIST fram
		bytes[cur++] = 0x4c;
		bytes[cur++] = 0x49;
		bytes[cur++] = 0x53;
		bytes[cur++] = 0x54;
		view.setUint32(cur, framChunkLen, true);
		cur += 4;
		bytes[cur++] = 0x66;
		bytes[cur++] = 0x72;
		bytes[cur++] = 0x61;
		bytes[cur++] = 0x6d;

		// icon 1
		bytes[cur++] = 0x69;
		bytes[cur++] = 0x63;
		bytes[cur++] = 0x6f;
		bytes[cur++] = 0x6e;
		view.setUint32(cur, dummyPng1.length, true);
		cur += 4;
		bytes.set(dummyPng1, cur);
		cur += pad(dummyPng1.length);

		// icon 2
		bytes[cur++] = 0x69;
		bytes[cur++] = 0x63;
		bytes[cur++] = 0x6f;
		bytes[cur++] = 0x6e;
		view.setUint32(cur, dummyPng2.length, true);
		cur += 4;
		bytes.set(dummyPng2, cur);
		cur += pad(dummyPng2.length);

		const result = parseAni(bytes);
		expect(result.header.cFrames).toBe(2);
		expect(result.header.title).toBe("TestCursor");
		expect(result.frames.length).toBe(2);
		expect(result.steps.length).toBe(2);
		expect(result.steps[0]?.frameFile).toBe("frame_000.png");
		expect(result.steps[1]?.frameFile).toBe("frame_001.png");

		// Run engine
		const zipBuffer = await aniToPngEngine.run(buffer, {}, () => {});
		expect(zipBuffer.byteLength).toBeGreaterThan(100);
		const zipBytes = new Uint8Array(zipBuffer);
		expect(zipBytes[0]).toBe(0x50);
		expect(zipBytes[1]).toBe(0x4b);
	});
});
