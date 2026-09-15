import { describe, expect, it } from "vitest";
import { convertVdaToPng, vdaToPngEngine } from "../index";

function createMockVdaImage(): Uint8Array {
	const width = 2;
	const height = 2;
	const bpp = 24; // 3 bytes per pixel (BGR)
	const headerLen = 18;
	const pixelBytes = width * height * 3;

	const buffer = new Uint8Array(headerLen + pixelBytes);
	const view = new DataView(buffer.buffer);

	buffer[0] = 0; // idLength
	buffer[1] = 0; // colorMapType
	buffer[2] = 2; // uncompressed truecolor

	view.setUint16(12, width, true);
	view.setUint16(14, height, true);
	buffer[16] = bpp;
	buffer[17] = 0x20; // top-down orientation flag

	// 4 pixels: Red, Green, Blue, White (BGR format)
	let ptr = 18;
	// Red (B=0, G=0, R=255)
	buffer[ptr++] = 0;
	buffer[ptr++] = 0;
	buffer[ptr++] = 255;
	// Green (B=0, G=255, R=0)
	buffer[ptr++] = 0;
	buffer[ptr++] = 255;
	buffer[ptr++] = 0;
	// Blue (B=255, G=0, R=0)
	buffer[ptr++] = 255;
	buffer[ptr++] = 0;
	buffer[ptr++] = 0;
	// White (B=255, G=255, R=255)
	buffer[ptr++] = 255;
	buffer[ptr++] = 255;
	buffer[ptr++] = 255;

	return buffer;
}

describe("VDA to PNG Engine", () => {
	it("rejects non-VDA buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertVdaToPng(invalid)).toThrow(/Buffer too small/);
	});

	it("decodes Truevision VDA 24-bit raster into valid PNG", () => {
		const mock = createMockVdaImage();
		const result = convertVdaToPng(mock);

		expect(result.metadata.width).toBe(2);
		expect(result.metadata.height).toBe(2);
		expect(result.metadata.pixelDepth).toBe(24);
		expect(result.pngBuffer).toBeInstanceOf(ArrayBuffer);
		expect(result.pngBuffer.byteLength).toBeGreaterThan(50);

		// Verify PNG signature: \x89PNG\r\n\x1a\n
		const bytes = new Uint8Array(result.pngBuffer);
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);
	});

	it("runs via engine interface with progress tracking", async () => {
		const mock = createMockVdaImage();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await vdaToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{},
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(50);
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
