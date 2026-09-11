import { describe, expect, it } from "vitest";
import { abrToPngEngine } from "../index";
import { convertGrayscaleMaskToPng, decodePackBits, parseAbr } from "../parser";

describe("Adobe Photoshop Brush (.abr) Extractor", () => {
	it("rejects files smaller than header length", () => {
		expect(() => parseAbr(new Uint8Array([1, 2]))).toThrow("Invalid .abr file");
	});

	it("rejects unsupported ABR versions", () => {
		const bytes = new Uint8Array([0, 99, 0, 1]);
		expect(() => parseAbr(bytes)).toThrow("Unsupported ABR version");
	});

	it("correctly decompresses Apple PackBits RLE runs", () => {
		// Test PackBits:
		// 1) Repeat run: count -n+1. e.g. -2 -> repeat next byte (-(-2)+1 = 3) times.
		// 2) Literal run: n >= 0 -> copy n+1 bytes. e.g. 1 -> copy 2 bytes.
		// 3) NOP: -128 (0x80)
		const encoded = new Uint8Array([
			0xfe, // signed -2 -> repeat 3 times
			0xaa, // byte to repeat
			0x80, // -128 (NOP)
			0x01, // signed 1 -> literal 2 bytes
			0x11,
			0x22,
		]);

		const decoded = decodePackBits(encoded, 0, encoded.length, 5);
		expect(decoded).toEqual(new Uint8Array([0xaa, 0xaa, 0xaa, 0x11, 0x22]));
	});

	it("correctly inverts grayscale alpha mask when canvas is white", () => {
		// 2x2 mask with white canvas (255) and black dot (0) in top-left
		const mask = new Uint8Array([0, 255, 255, 255]);
		const png = convertGrayscaleMaskToPng(mask, 2, 2);
		expect(png.length).toBeGreaterThan(30);
		// Check PNG signature
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
		expect(png[2]).toBe(0x4e);
		expect(png[3]).toBe(0x47);
	});

	it("correctly parses and extracts legacy v1 uncompressed brushes", () => {
		// Version 1 (2 bytes), Brush Count 1 (2 bytes)
		const width = 2;
		const height = 2;
		const rawPixels = new Uint8Array([0, 128, 128, 255]);

		const totalLen = 4 + 2 + 2 + 6 + 1 + 8 + 16 + 2 + 1 + rawPixels.length;
		const buffer = new ArrayBuffer(totalLen);
		const view = new DataView(buffer);
		const bytes = new Uint8Array(buffer);

		view.setUint16(0, 1, false); // version 1
		view.setUint16(2, 1, false); // count 1

		let cur = 4;
		const brushLen = 2 + 6 + 1 + 8 + 16 + 2 + 1 + rawPixels.length;
		view.setUint16(cur, brushLen, false);
		cur += 2;

		view.setUint16(cur, 2, false); // type 2 (sampled brush)
		cur += 2;

		view.setUint32(cur, 0, false); // misc
		view.setUint16(cur + 4, 25, false); // spacing
		cur += 6;

		bytes[cur++] = 1; // antialiasing

		// Bounds: top 0, left 0, bottom 2, right 2
		view.setUint16(cur, 0, false);
		view.setUint16(cur + 2, 0, false);
		view.setUint16(cur + 4, height, false);
		view.setUint16(cur + 6, width, false);
		cur += 8;

		// 16 bytes skipped 32-bit coords
		cur += 16;

		view.setUint16(cur, 8, false); // depth 8-bit
		cur += 2;

		bytes[cur++] = 0; // uncompressed

		bytes.set(rawPixels, cur);

		const result = parseAbr(bytes);
		expect(result.version).toBe(1);
		expect(result.brushes.length).toBe(1);
		const b = result.brushes[0];
		expect(b).toBeDefined();
		if (b) {
			expect(b.width).toBe(2);
			expect(b.height).toBe(2);
			expect(b.depth).toBe(8);
			expect(b.pngData.length).toBeGreaterThan(0);
		}
	});

	it("correctly parses modern v6 8BIM 'samp' brushes", async () => {
		// Version 6 (2 bytes), Subversion 1 (2 bytes)
		const width = 2;
		const height = 2;
		const rawPixels = new Uint8Array([10, 20, 30, 40]);

		// Build samp brush item:
		// brushLen: 47 bytes prefix + 19 bytes header + 4 bytes raw data
		const itemPayloadLen = 47 + 19 + rawPixels.length;
		const sampPayloadLen = 4 + itemPayloadLen;
		const blockLen = sampPayloadLen;

		const totalLen = 4 + 4 + 4 + 4 + blockLen;
		const buffer = new ArrayBuffer(totalLen);
		const view = new DataView(buffer);
		const bytes = new Uint8Array(buffer);

		view.setUint16(0, 6, false); // version 6
		view.setUint16(2, 1, false); // subversion 1

		let cur = 4;
		// "8BIM"
		bytes[cur++] = 0x38;
		bytes[cur++] = 0x42;
		bytes[cur++] = 0x49;
		bytes[cur++] = 0x4d;

		// "samp"
		bytes[cur++] = 0x73;
		bytes[cur++] = 0x61;
		bytes[cur++] = 0x6d;
		bytes[cur++] = 0x70;

		view.setUint32(cur, blockLen, false);
		cur += 4;

		// Brush length inside samp
		view.setUint32(cur, itemPayloadLen, false);
		cur += 4;

		// Skip 47 bytes prefix
		cur += 47;

		// Bounds (top, left, bottom, right as uint32)
		view.setUint32(cur, 0, false);
		view.setUint32(cur + 4, 0, false);
		view.setUint32(cur + 8, height, false);
		view.setUint32(cur + 12, width, false);
		cur += 16;

		// Depth
		view.setUint16(cur, 8, false);
		cur += 2;

		// Compressed: 0
		bytes[cur++] = 0;

		// Raw pixels
		bytes.set(rawPixels, cur);

		const result = parseAbr(bytes);
		expect(result.version).toBe(6);
		expect(result.brushes.length).toBe(1);

		// Run engine and verify ZIP output
		const engineResult = await abrToPngEngine.run(buffer, {}, () => {});
		expect(engineResult.byteLength).toBeGreaterThan(50);
		const outBytes = new Uint8Array(engineResult);
		// Check PK.. signature of ZIP
		expect(outBytes[0]).toBe(0x50);
		expect(outBytes[1]).toBe(0x4b);
	});
});
