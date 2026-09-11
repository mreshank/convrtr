import { describe, expect, it } from "vitest";
import { convertTimToPng, timToPngEngine } from "../index";

function buildMock4BitTim(): Uint8Array {
	// Total size: Header (8) + CLUT (12 + 16 * 2 = 44) + Image (12 + 1 word * 4 lines * 2 bytes = 20) = 72 bytes
	const buffer = new Uint8Array(72);
	const view = new DataView(buffer.buffer);

	// Header
	buffer[0] = 0x10;
	buffer[1] = 0x00;
	view.setUint32(4, 0x08, true); // PMODE=0 (4-bit), CF=1 (has CLUT)

	// CLUT Block
	let ptr = 8;
	view.setUint32(ptr, 44, true); // length = 44
	view.setUint16(ptr + 4, 0, true); // X = 0
	view.setUint16(ptr + 6, 0, true); // Y = 0
	view.setUint16(ptr + 8, 16, true); // W = 16
	view.setUint16(ptr + 10, 1, true); // H = 1

	// Colors: Index 0 = Black transparent (0x0000), Index 1 = Pure Red (R=31 -> 0x001F)
	view.setUint16(ptr + 12, 0x0000, true); // 0
	view.setUint16(ptr + 14, 0x001f, true); // 1: Red
	for (let i = 2; i < 16; i++) {
		view.setUint16(ptr + 12 + i * 2, 0x7fff, true); // White
	}
	ptr += 44;

	// Image Block: 4x4 pixels -> imgW = 1 word (4 px), imgH = 4 lines
	view.setUint32(ptr, 20, true); // length = 20
	view.setUint16(ptr + 4, 320, true); // X
	view.setUint16(ptr + 6, 240, true); // Y
	view.setUint16(ptr + 8, 1, true); // W = 1 word (4 px)
	view.setUint16(ptr + 10, 4, true); // H = 4 lines

	// Pixel data: 4 lines * 2 bytes per line = 8 bytes
	// Each byte holds 2 pixels: low nibble = px 0, high nibble = px 1
	// E.g. 0x10 = px0 is 0 (transparent), px1 is 1 (red)
	for (let line = 0; line < 4; line++) {
		buffer[ptr + 12 + line * 2] = 0x10;
		buffer[ptr + 12 + line * 2 + 1] = 0x11; // px2 is 1 (red), px3 is 1 (red)
	}

	return buffer;
}

function buildMock15BitTim(): Uint8Array {
	// Total size: Header (8) + Image (12 + 2 words * 2 lines * 2 bytes = 20) = 28 bytes
	const buffer = new Uint8Array(28);
	const view = new DataView(buffer.buffer);

	// Header
	buffer[0] = 0x10;
	buffer[1] = 0x00;
	view.setUint32(4, 0x02, true); // PMODE=2 (15-bit), CF=0 (no CLUT)

	// Image Block: 2x2 pixels -> imgW = 2 words, imgH = 2 lines
	const ptr = 8;
	view.setUint32(ptr, 20, true);
	view.setUint16(ptr + 4, 0, true);
	view.setUint16(ptr + 6, 0, true);
	view.setUint16(ptr + 8, 2, true); // W = 2 px
	view.setUint16(ptr + 10, 2, true); // H = 2 lines

	// Pixel data: RGB555 words (e.g. Green: G=31 -> 0x03E0)
	view.setUint16(ptr + 12, 0x03e0, true); // Green
	view.setUint16(ptr + 14, 0x7c00, true); // Blue: B=31 -> 0x7C00
	view.setUint16(ptr + 16, 0x001f, true); // Red: R=31 -> 0x001F
	view.setUint16(ptr + 18, 0x7fff, true); // White

	return buffer;
}

describe("Sony PlayStation 1 TIM Converter Engine", () => {
	it("parses 4-bit indexed CLUT TIM images with transparency", () => {
		const tim = buildMock4BitTim();
		const result = convertTimToPng(tim);

		expect(result.metadata.mode).toBe("4bit");
		expect(result.metadata.hasClut).toBe(true);
		expect(result.metadata.width).toBe(4);
		expect(result.metadata.height).toBe(4);
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("parses 15-bit direct color TIM images without CLUT", () => {
		const tim = buildMock15BitTim();
		const result = convertTimToPng(tim);

		expect(result.metadata.mode).toBe("15bit");
		expect(result.metadata.hasClut).toBe(false);
		expect(result.metadata.width).toBe(2);
		expect(result.metadata.height).toBe(2);
		expect(result.pngBytes.length).toBeGreaterThan(16);
	});

	it("runs end-to-end via timToPngEngine interface", async () => {
		const tim = buildMock4BitTim();
		const output = await timToPngEngine.run(
			tim.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const png = new Uint8Array(output);

		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
		expect(png[2]).toBe(0x4e);
		expect(png[3]).toBe(0x47);
	});

	it("throws on invalid magic signature", () => {
		const corrupted = new Uint8Array([
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		]);
		expect(() => convertTimToPng(corrupted)).toThrow(/Invalid TIM signature/);
	});

	it("throws on truncated buffer", () => {
		const truncated = new Uint8Array([0x10, 0x00]);
		expect(() => convertTimToPng(truncated)).toThrow(
			/smaller than the minimum/,
		);
	});
});
