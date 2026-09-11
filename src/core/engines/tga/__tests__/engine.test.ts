import { describe, expect, it } from "vitest";
import { tgaToPngEngine } from "../index";
import { parseTga } from "../parser";

function createTgaHeader(options: {
	idLength?: number;
	colorMapType?: number;
	imageType: number;
	colorMapStart?: number;
	colorMapLength?: number;
	colorMapDepth?: number;
	xOrigin?: number;
	yOrigin?: number;
	width: number;
	height: number;
	pixelDepth: number;
	imageDescriptor?: number;
}): Uint8Array {
	const header = new Uint8Array(18);
	const view = new DataView(header.buffer);

	header[0] = options.idLength ?? 0;
	header[1] = options.colorMapType ?? 0;
	header[2] = options.imageType;

	view.setUint16(3, options.colorMapStart ?? 0, true);
	view.setUint16(5, options.colorMapLength ?? 0, true);
	header[7] = options.colorMapDepth ?? 0;

	view.setUint16(8, options.xOrigin ?? 0, true);
	view.setUint16(10, options.yOrigin ?? 0, true);
	view.setUint16(12, options.width, true);
	view.setUint16(14, options.height, true);
	header[16] = options.pixelDepth;
	header[17] = options.imageDescriptor ?? 0;

	return header;
}

describe("Truevision TGA Parser & Engine", () => {
	it("parses uncompressed 24-bit BGR TGA image", () => {
		// 2x2 image, bottom-up (descriptor = 0)
		// Row 0 (bottom): [Red, Green] = [0,0,255], [0,255,0]
		// Row 1 (top):    [Blue, White] = [255,0,0], [255,255,255]
		const header = createTgaHeader({
			imageType: 2,
			width: 2,
			height: 2,
			pixelDepth: 24,
		});

		// Bottom row: Red (BGR: 0, 0, 255), Green (BGR: 0, 255, 0)
		// Top row: Blue (BGR: 255, 0, 0), White (BGR: 255, 255, 255)
		const pixels = new Uint8Array([
			0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255,
		]);

		const tgaBytes = new Uint8Array(header.length + pixels.length);
		tgaBytes.set(header, 0);
		tgaBytes.set(pixels, header.length);

		const result = parseTga(tgaBytes);
		expect(result.width).toBe(2);
		expect(result.height).toBe(2);
		expect(result.pixelDepth).toBe(24);
		expect(result.isRle).toBe(false);
		expect(result.pngBytes.length).toBeGreaterThan(50);
		// Check PNG signature: 0x89, P, N, G
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("parses uncompressed 32-bit BGRA with transparency", () => {
		const header = createTgaHeader({
			imageType: 2,
			width: 1,
			height: 2,
			pixelDepth: 32,
			imageDescriptor: 0x28, // 8-bit alpha, top-down
		});

		// Pixel 1: semi-transparent blue (BGR: 255, 0, 0, Alpha: 128)
		// Pixel 2: fully transparent (BGR: 0, 0, 0, Alpha: 0)
		const pixels = new Uint8Array([255, 0, 0, 128, 0, 0, 0, 0]);

		const tgaBytes = new Uint8Array(header.length + pixels.length);
		tgaBytes.set(header, 0);
		tgaBytes.set(pixels, header.length);

		const result = parseTga(tgaBytes);
		expect(result.width).toBe(1);
		expect(result.height).toBe(2);
		expect(result.hasAlpha).toBe(true);
		expect(result.pixelDepth).toBe(32);
	});

	it("parses uncompressed 8-bit grayscale TGA image", () => {
		const header = createTgaHeader({
			imageType: 3,
			width: 2,
			height: 1,
			pixelDepth: 8,
		});

		const pixels = new Uint8Array([64, 192]);
		const tgaBytes = new Uint8Array(header.length + pixels.length);
		tgaBytes.set(header, 0);
		tgaBytes.set(pixels, header.length);

		const result = parseTga(tgaBytes);
		expect(result.width).toBe(2);
		expect(result.height).toBe(1);
		expect(result.imageTypeName).toBe("Uncompressed Grayscale");
	});

	it("parses 8-bit paletted (color-mapped) TGA image", () => {
		const header = createTgaHeader({
			colorMapType: 1,
			imageType: 1,
			colorMapStart: 0,
			colorMapLength: 2,
			colorMapDepth: 24,
			width: 2,
			height: 1,
			pixelDepth: 8,
		});

		// Palette: Index 0 = Yellow (BGR: 0, 255, 255), Index 1 = Magenta (BGR: 255, 0, 255)
		const palette = new Uint8Array([0, 255, 255, 255, 0, 255]);
		// Pixels: [0, 1]
		const pixels = new Uint8Array([0, 1]);

		const tgaBytes = new Uint8Array(
			header.length + palette.length + pixels.length,
		);
		tgaBytes.set(header, 0);
		tgaBytes.set(palette, header.length);
		tgaBytes.set(pixels, header.length + palette.length);

		const result = parseTga(tgaBytes);
		expect(result.width).toBe(2);
		expect(result.height).toBe(1);
		expect(result.imageTypeName).toBe("Uncompressed Color-Mapped");
	});

	it("decodes RLE compressed truecolor TGA image", () => {
		// 4x1 pixels: 3 red pixels (RLE packet) followed by 1 green pixel (raw packet)
		const header = createTgaHeader({
			imageType: 10, // RLE Truecolor
			width: 4,
			height: 1,
			pixelDepth: 24,
		});

		// Packet 1: RLE packet of 3 pixels (count 3: header = 0x80 | (3 - 1) = 0x82)
		// Pixel: Red (BGR: 0, 0, 255)
		// Packet 2: Raw packet of 1 pixel (count 1: header = 0x00 | (1 - 1) = 0x00)
		// Pixel: Green (BGR: 0, 255, 0)
		const rleData = new Uint8Array([
			0x82,
			0,
			0,
			255, // 3x Red
			0x00,
			0,
			255,
			0, // 1x Green
		]);

		const tgaBytes = new Uint8Array(header.length + rleData.length);
		tgaBytes.set(header, 0);
		tgaBytes.set(rleData, header.length);

		const result = parseTga(tgaBytes);
		expect(result.width).toBe(4);
		expect(result.height).toBe(1);
		expect(result.isRle).toBe(true);
		expect(result.pngBytes[0]).toBe(0x89);
	});

	it("handles image ID metadata", () => {
		const idText = "Convrtr-TGA-Test";
		const idBytes = new TextEncoder().encode(idText);

		const header = createTgaHeader({
			idLength: idBytes.length,
			imageType: 3,
			width: 1,
			height: 1,
			pixelDepth: 8,
		});

		const pixels = new Uint8Array([128]);
		const tgaBytes = new Uint8Array(
			header.length + idBytes.length + pixels.length,
		);
		tgaBytes.set(header, 0);
		tgaBytes.set(idBytes, header.length);
		tgaBytes.set(pixels, header.length + idBytes.length);

		const result = parseTga(tgaBytes);
		expect(result.idString).toBe(idText);
	});

	it("throws on invalid or truncated header", () => {
		expect(() => parseTga(new Uint8Array(10))).toThrow(
			/smaller than the 18-byte TGA header/,
		);
		expect(() =>
			parseTga(
				createTgaHeader({
					imageType: 2,
					width: 0,
					height: 10,
					pixelDepth: 24,
				}),
			),
		).toThrow(/dimensions/);
		expect(() =>
			parseTga(
				createTgaHeader({
					imageType: 7, // Unsupported
					width: 10,
					height: 10,
					pixelDepth: 24,
				}),
			),
		).toThrow(/Unsupported TGA image type/);
	});

	it("runs conversion through tgaToPngEngine", async () => {
		const header = createTgaHeader({
			imageType: 3,
			width: 2,
			height: 2,
			pixelDepth: 8,
		});
		const pixels = new Uint8Array([10, 20, 30, 40]);
		const tgaBytes = new Uint8Array(header.length + pixels.length);
		tgaBytes.set(header, 0);
		tgaBytes.set(pixels, header.length);

		expect(await tgaToPngEngine.probe()).toBe(true);

		let lastProgress = 0;
		const outputBuffer = await tgaToPngEngine.run(
			tgaBytes.buffer as ArrayBuffer,
			{},
			(p) => {
				lastProgress = p;
			},
		);

		expect(lastProgress).toBe(1.0);
		expect(outputBuffer.byteLength).toBeGreaterThan(40);
		const pngSig = new Uint8Array(outputBuffer, 0, 4);
		expect(pngSig[0]).toBe(0x89);
		expect(pngSig[1]).toBe(0x50);
		expect(pngSig[2]).toBe(0x4e);
		expect(pngSig[3]).toBe(0x47);
	});
});
