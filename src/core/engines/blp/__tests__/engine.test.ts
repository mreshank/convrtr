import { describe, expect, it } from "vitest";
import { blpToPngEngine, convertBlpToPng } from "../index";

function createMockBlp1Paletted(): Uint8Array {
	const buffer = new Uint8Array(1180 + 32);
	const view = new DataView(buffer.buffer);

	// Signature: BLP1
	buffer.set([0x42, 0x4c, 0x50, 0x31], 0);

	// Type = 1 (Paletted)
	view.setUint32(4, 1, true);
	// Alpha depth = 8
	view.setUint32(8, 8, true);
	// Width = 4, Height = 4
	view.setUint32(12, 4, true);
	view.setUint32(16, 4, true);
	// PictureSubType = 1
	view.setUint32(20, 1, true);
	// HasMipmaps = 0
	view.setUint32(24, 0, true);

	// Mipmap offset 0 = 1180
	view.setUint32(28, 1180, true);
	// Mipmap length 0 = 32
	view.setUint32(92, 32, true);

	// Palette at 156: 256 * 4 bytes BGRA
	// Entry 0: Red (B=0, G=0, R=255, A=255)
	buffer[156] = 0;
	buffer[157] = 0;
	buffer[158] = 255;
	buffer[159] = 255;

	// Entry 1: Blue (B=255, G=0, R=0, A=255)
	buffer[160] = 255;
	buffer[161] = 0;
	buffer[162] = 0;
	buffer[163] = 255;

	// 16 indices at 1180
	for (let i = 0; i < 16; i++) {
		buffer[1180 + i] = i % 2;
	}
	// 16 alpha bytes at 1180 + 16
	for (let i = 0; i < 16; i++) {
		buffer[1180 + 16 + i] = 255;
	}

	return buffer;
}

function createMockBlp2Dxt1(): Uint8Array {
	const buffer = new Uint8Array(148 + 8);
	const view = new DataView(buffer.buffer);

	// Signature: BLP2
	buffer.set([0x42, 0x4c, 0x50, 0x32], 0);

	// Type = 1 (Direct)
	view.setUint32(4, 1, true);
	// Compression = 2 (DXT)
	buffer[8] = 2;
	// AlphaDepth = 0
	buffer[9] = 0;
	// AlphaEncoding = 0 (DXT1)
	buffer[10] = 0;
	// HasMipmaps = 0
	buffer[11] = 0;

	// Width = 4, Height = 4
	view.setUint32(12, 4, true);
	view.setUint32(16, 4, true);

	// Mipmap offset 0 = 148
	view.setUint32(20, 148, true);
	// Mipmap length 0 = 8
	view.setUint32(84, 8, true);

	// 8-byte DXT1 block at 148:
	// color0 = 0xF800 (Red), color1 = 0x001F (Blue)
	buffer[148] = 0x00;
	buffer[149] = 0xf8;
	buffer[150] = 0x1f;
	buffer[151] = 0x00;
	// 4 bytes lookup = all color 0
	buffer[152] = 0x00;
	buffer[153] = 0x00;
	buffer[154] = 0x00;
	buffer[155] = 0x00;

	return buffer;
}

describe("BLP to PNG Engine", () => {
	it("rejects non-BLP buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertBlpToPng(invalid)).toThrow(/Invalid BLP file/);
	});

	it("decodes Warcraft III BLP1 paletted texture into valid PNG", () => {
		const mock = createMockBlp1Paletted();
		const result = convertBlpToPng(mock);

		expect(result.metadata.version).toBe("BLP1");
		expect(result.metadata.width).toBe(4);
		expect(result.metadata.height).toBe(4);
		expect(result.pngBuffer).toBeInstanceOf(ArrayBuffer);
		expect(result.pngBuffer.byteLength).toBeGreaterThan(50);

		// Verify PNG signature: \x89PNG\r\n\x1a\n
		const bytes = new Uint8Array(result.pngBuffer);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);
	});

	it("decodes World of Warcraft BLP2 DXT1 texture into valid PNG", () => {
		const mock = createMockBlp2Dxt1();
		const result = convertBlpToPng(mock);

		expect(result.metadata.version).toBe("BLP2");
		expect(result.metadata.compressionName).toBe("DXT1");
		expect(result.metadata.width).toBe(4);
		expect(result.metadata.height).toBe(4);
		expect(result.pngBuffer).toBeInstanceOf(ArrayBuffer);

		const bytes = new Uint8Array(result.pngBuffer);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);
	});

	it("runs via engine interface with progress tracking", async () => {
		const mock = createMockBlp1Paletted();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await blpToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(50);
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
