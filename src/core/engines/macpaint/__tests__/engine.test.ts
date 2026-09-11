import { describe, expect, it } from "vitest";
import { convertMacPaintToPng, macPaintToPngEngine } from "../index";

function buildMockMacPaint(): Uint8Array {
	// 512-byte header + 576 rows * 2 bytes (PackBits repeat 72 bytes of 0xAA)
	// 72 bytes repeat: count = 72. In PackBits: b = 256 - 72 + 1 = 185 (0xb9)
	const totalLen = 512 + 576 * 2;
	const buffer = new Uint8Array(totalLen);
	const view = new DataView(buffer.buffer);

	// Header version
	view.setUint32(0, 2, false);

	let offset = 512;
	for (let i = 0; i < 576; i++) {
		buffer[offset++] = 185; // repeat 72 times
		buffer[offset++] = 0xaa; // alternating bit pattern 10101010
	}

	return buffer;
}

describe("Apple Macintosh MacPaint Converter Engine", () => {
	it("decompresses 576x576 MacPaint PackBits into standard PNG", () => {
		const mac = buildMockMacPaint();
		const result = convertMacPaintToPng(mac);

		expect(result.metadata.width).toBe(576);
		expect(result.metadata.height).toBe(576);
		expect(result.metadata.version).toBe(2);
		expect(result.metadata.uncompressedBytes).toBe(41472);
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("supports transparentBackground and invertColors options", () => {
		const mac = buildMockMacPaint();
		const result = convertMacPaintToPng(mac, {
			transparentBackground: true,
			invertColors: true,
		});

		expect(result.pngBytes.length).toBeGreaterThan(16);
	});

	it("runs end-to-end via macPaintToPngEngine interface", async () => {
		const mac = buildMockMacPaint();
		const output = await macPaintToPngEngine.run(
			mac.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const png = new Uint8Array(output);

		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
		expect(png[2]).toBe(0x4e);
		expect(png[3]).toBe(0x47);
	});

	it("throws on file smaller than 512-byte header", () => {
		const truncated = new Uint8Array(100);
		expect(() => convertMacPaintToPng(truncated)).toThrow(
			/smaller than the minimum/,
		);
	});
});
