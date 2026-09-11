import { describe, expect, it } from "vitest";
import { convertDegasToPng } from "../parser";

describe("degas engine", () => {
	it("rejects files smaller than 34 bytes", () => {
		const tooSmall = new Uint8Array(20);
		expect(() => convertDegasToPng(tooSmall)).toThrow(
			/too small to contain a 34-byte DEGAS header/,
		);
	});

	it("decodes uncompressed low-resolution .pi1 (320x200, 16 colors)", () => {
		// Header: 2 bytes mode (0x0000 = low res) + 16 words palette + 32,000 bytes bitmap
		const data = new Uint8Array(32034);
		const view = new DataView(data.buffer);
		view.setUint16(0, 0, false); // Mode 0 (low res)

		// Palette: color 0 = black (0x000), color 1 = red (0x700), color 2 = green (0x070)
		view.setUint16(2, 0x0000, false);
		view.setUint16(4, 0x0700, false); // Red: R=7, G=0, B=0
		view.setUint16(6, 0x0070, false); // Green: R=0, G=7, B=0

		// Write some bits in the first 16-pixel chunk (offset 34)
		// w0 = plane 0, w1 = plane 1, w2 = plane 2, w3 = plane 3
		view.setUint16(34, 0x8000, false); // Plane 0 bit 15 = 1 -> color index 1 (Red)
		view.setUint16(36, 0x4000, false); // Plane 1 bit 14 = 1 -> color index 2 (Green)

		const result = convertDegasToPng(data);
		expect(result.metadata.resolutionMode).toBe(0);
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.compressed).toBe(false);
		expect(result.metadata.colorsUsed).toBeGreaterThanOrEqual(2);
		expect(result.pngBytes.length).toBeGreaterThan(100);
		// Check PNG magic: 0x89, 'P', 'N', 'G'
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("decodes medium-resolution .pi2 (640x200 aspect-corrected to 640x400)", () => {
		const data = new Uint8Array(32034);
		const view = new DataView(data.buffer);
		view.setUint16(0, 1, false); // Mode 1 (med res)

		const result = convertDegasToPng(data);
		expect(result.metadata.resolutionMode).toBe(1);
		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400); // Vertically doubled for native CRT aspect
		expect(result.pngBytes.length).toBeGreaterThan(100);
	});

	it("decodes high-resolution monochrome .pi3 (640x400)", () => {
		const data = new Uint8Array(32034);
		const view = new DataView(data.buffer);
		view.setUint16(0, 2, false); // Mode 2 (high res)

		const result = convertDegasToPng(data);
		expect(result.metadata.resolutionMode).toBe(2);
		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400);
		expect(result.pngBytes.length).toBeGreaterThan(100);
	});

	it("decodes compressed DEGAS Elite file (.pc1)", () => {
		// 34-byte header + PackBits RLE stream
		// Mode 0x8000 | 0 = compressed low res
		const header = new Uint8Array(34);
		const view = new DataView(header.buffer);
		view.setUint16(0, 0x8000, false);

		// PackBits RLE compressed body: 250 bytes of byte run 0x00
		// In PackBits, count > 128 means repeat (257 - count) times.
		// Let's create a minimal compressed stream: 0x00 (copy 1 byte), 0x55
		const compressed = new Uint8Array([0x00, 0x55]);
		const fileData = new Uint8Array(header.length + compressed.length);
		fileData.set(header, 0);
		fileData.set(compressed, 34);

		const result = convertDegasToPng(fileData);
		expect(result.metadata.compressed).toBe(true);
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.pngBytes.length).toBeGreaterThan(100);
	});

	it("applies scale factor 2x", () => {
		const data = new Uint8Array(32034);
		const view = new DataView(data.buffer);
		view.setUint16(0, 0, false);

		const result = convertDegasToPng(data, { scale: 2 });
		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400);
	});
});
